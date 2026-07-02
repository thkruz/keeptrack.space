import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Kilometers, Milliseconds, Satellite } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { Camera } from '../camera/camera';
import { CameraType } from '../camera/camera-type';
import { PluginRegistry } from '../core/plugin-registry';
import { Scene } from '../core/scene';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { LayoutInsets, Viewport, ViewportLayout } from './viewport';
import type { WebGLRenderer } from './webgl-renderer';

export { Viewport, ViewportLayout } from './viewport';
export type { LayoutInsets } from './viewport';

/**
 * Owns the list of simultaneously rendered cameras and runs the per-viewport
 * render passes (gl.viewport + gl.scissor on the shared canvas).
 *
 * Viewport 0 always wraps the engine's main camera. In SINGLE layout the render
 * path is byte-for-byte the legacy one (no scissor, null camera.viewport).
 */
export class ViewportManager {
  private static instance_: ViewportManager | null = null;

  static readonly SPLIT_FRACTION_MIN = 0.15;
  static readonly SPLIT_FRACTION_MAX = 0.85;
  /** Gap between split panes in px (the DOM divider renders on top of it). */
  private static readonly DIVIDER_GAP_PX_ = 2;
  private static readonly PIP_WIDTH_FRACTION_ = 0.28;
  private static readonly PIP_MIN_WIDTH_PX_ = 240;
  private static readonly PIP_ASPECT_ = 16 / 9;
  private static readonly PIP_MARGIN_PX_ = 12;

  private layout_: ViewportLayout = ViewportLayout.SINGLE;
  private splitFraction_ = 0.5;
  private viewports_: Viewport[] = [];
  private activePass_: Viewport | null = null;
  private hoveredViewport_: Viewport | null = null;
  private capturedViewport_: Viewport | null = null;
  private focusedViewportId_ = 'main';

  insets: LayoutInsets = { left: 0, right: 0, bottom: 0, top: 0 };

  static getInstance(): ViewportManager {
    ViewportManager.instance_ ??= new ViewportManager();

    return ViewportManager.instance_;
  }

  /** Returns to single layout and drops all state (used by tests and teardown). */
  reset(): void {
    this.destroySecondary_();
    this.layout_ = ViewportLayout.SINGLE;
    this.splitFraction_ = 0.5;
    this.insets = { left: 0, right: 0, bottom: 0, top: 0 };
    this.viewports_ = [];
    this.activePass_ = null;
    this.hoveredViewport_ = null;
    this.capturedViewport_ = null;
    this.focusedViewportId_ = 'main';
  }

  // ── Input routing ─────────────────────────────────────────────────────────

  get focusedViewportId(): string {
    return this.focusedViewportId_;
  }

  /**
   * Camera that should receive pointer input at the given canvas coordinates
   * (y from TOP). While a drag is captured the capturing pane keeps receiving
   * input even when the cursor crosses into another pane.
   */
  cameraForInput(canvasX: number, canvasY: number): Camera {
    if (this.capturedViewport_) {
      return this.capturedViewport_.camera;
    }

    const gl = ServiceLocator.getRenderer()?.gl;

    if (!gl || !this.isMultiViewActive()) {
      return this.getMainViewport()?.camera ?? ServiceLocator.getMainCamera();
    }

    this.hoveredViewport_ = this.viewportAt(canvasX, canvasY, gl);

    return this.hoveredViewport_?.camera ?? ServiceLocator.getMainCamera();
  }

  /** Camera for input events without fresh coordinates (wheel, buttons): captured, then hovered, then main. */
  getInputCamera(): Camera {
    return this.capturedViewport_?.camera ?? this.hoveredViewport_?.camera ?? this.getMainViewport()?.camera ?? ServiceLocator.getMainCamera();
  }

  /** Starts a pointer capture on the pane under the cursor (mousedown) and focuses it. */
  beginInputCapture(canvasX: number, canvasY: number): void {
    const gl = ServiceLocator.getRenderer()?.gl;

    if (!gl || !this.isMultiViewActive()) {
      this.capturedViewport_ = this.getMainViewport();

      return;
    }

    this.capturedViewport_ = this.viewportAt(canvasX, canvasY, gl);
    this.focusedViewportId_ = this.capturedViewport_?.id ?? 'main';
  }

  /** Releases the pointer capture (mouseup). */
  endInputCapture(): void {
    this.capturedViewport_ = null;
  }

  get layout(): ViewportLayout {
    return this.layout_;
  }

  get splitFraction(): number {
    return this.splitFraction_;
  }

  set splitFraction(fraction: number) {
    this.splitFraction_ = Math.min(ViewportManager.SPLIT_FRACTION_MAX, Math.max(ViewportManager.SPLIT_FRACTION_MIN, fraction));
  }

  get viewports(): readonly Viewport[] {
    return this.viewports_;
  }

  getMainViewport(): Viewport | null {
    return this.viewports_[0] ?? null;
  }

  getSecondaryViewport(): Viewport | null {
    return this.viewports_[1] ?? null;
  }

  isMultiViewActive(): boolean {
    return this.layout_ !== ViewportLayout.SINGLE && this.viewports_.length > 1;
  }

  /** Lazily binds viewport 0 to the engine's main camera (idempotent). */
  ensureMainViewport(mainCamera: Camera): Viewport {
    if (this.viewports_.length === 0 || this.viewports_[0].camera !== mainCamera) {
      const others = this.viewports_.slice(1);

      this.viewports_ = [new Viewport('main', mainCamera), ...others];
    }

    return this.viewports_[0];
  }

  /**
   * Switches the multi-view layout. SPLIT_HORIZONTAL and PIP create the
   * secondary camera on demand; SINGLE tears it down (running its mode
   * delegate's onExit so no global override leaks).
   */
  setLayout(layout: ViewportLayout, opts?: { secondaryCameraType?: CameraType }): void {
    if (layout === this.layout_ && !opts?.secondaryCameraType) {
      return;
    }

    const mainCamera = ServiceLocator.getMainCamera();

    this.ensureMainViewport(mainCamera);

    if (layout === ViewportLayout.SINGLE) {
      this.destroySecondary_();
    } else {
      const secondary = this.getSecondaryViewport() ?? this.createSecondary_();

      if (layout === ViewportLayout.PIP) {
        this.configurePipCamera_(secondary.camera);
      } else if (opts?.secondaryCameraType !== undefined) {
        this.applySecondaryCameraType_(secondary.camera, opts.secondaryCameraType);
      }
    }

    const mainViewport = this.getMainViewport();

    if (mainViewport) {
      mainViewport.camera.viewport = null;
    }

    this.layout_ = layout;
    EventBus.getInstance().emit(EventBusEvent.viewportLayoutChanged, layout);
  }

  /**
   * Per-frame update for secondary cameras (the renderer updates the main one).
   * Runs before updatePMatrix so main.viewport is current for the projection.
   */
  update(dt: Milliseconds): void {
    if (!this.isMultiViewActive()) {
      const mainViewport = this.getMainViewport();

      if (mainViewport) {
        mainViewport.camera.viewport = null;
      }

      return;
    }

    const gl = ServiceLocator.getRenderer()?.gl;

    if (!gl) {
      return;
    }

    this.updateRects_(gl);

    const mainViewport = this.viewports_[0];

    // In PIP the main pane fills the buffer, so keep the exact single-view projection
    mainViewport.camera.viewport = this.layout_ === ViewportLayout.PIP ? null : { ...mainViewport.rect };

    for (let i = 1; i < this.viewports_.length; i++) {
      const viewport = this.viewports_[i];
      const camera = viewport.camera;

      if (this.layout_ === ViewportLayout.PIP && this.isSatelliteFocusedType_(camera.cameraType)) {
        // A satellite-focused PIP follows the shared selection; hide the pane
        // when nothing is selected (other camera modes stay visible)
        const primarySat = PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj;

        viewport.isVisible = (primarySat?.id ?? -1) !== -1;
        if (!viewport.isVisible) {
          continue;
        }
      } else {
        viewport.isVisible = true;
      }

      camera.viewport = { ...viewport.rect };

      // Keep secondary satellite-focused cameras snapped without triggering
      // global side effects (selectedColor, near/far renderer switching)
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);
      const primarySatObj = selectSatManager?.primarySatObj;

      if (primarySatObj && primarySatObj.id !== -1 && this.isSatelliteFocusedType_(camera.cameraType)) {
        const timeManager = ServiceLocator.getTimeManager();

        camera.snapToSat(primarySatObj as Satellite, timeManager.simulationTimeObj, false);
      }

      camera.update(dt);
    }
  }

  /**
   * Renders all visible viewports. SINGLE layout takes the legacy path with no
   * GL scissor/viewport changes at all.
   */
  renderAll(renderer: WebGLRenderer, scene: Scene, mainCamera: Camera): void {
    const mainViewport = this.ensureMainViewport(mainCamera);

    if (!this.isMultiViewActive()) {
      mainViewport.camera.viewport = null;
      mainViewport.camera.draw(renderer.sensorPos);
      renderer.render(scene, mainViewport.camera);

      return;
    }

    const gl = renderer.gl;

    // Clear the whole canvas first so regions outside the panes (insets,
    // layout changes, moved chrome like an undocked sat-info-box) never show
    // stale pixels from previous frames
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const viewport of this.viewports_) {
      if (!viewport.isVisible) {
        continue;
      }

      const camera = viewport.camera;

      this.activePass_ = viewport;
      ServiceLocator.setActiveRenderCamera(camera);
      try {
        this.applyPassViewport(gl);
        // Panes without their own world-shift override inherit the main pane's
        // shift: update-time transforms (Earth model matrix, mesh positions)
        // were computed with the main camera's shift, so re-resolving per
        // camera would desync the dots from them
        scene.applyWorldShiftForCamera(camera.worldShiftOverride ? camera : mainViewport.camera);

        // Secondary perspective cameras rebuild their projection each pass
        // (the renderer's updatePMatrix only maintains the main camera's).
        // Delegate 2D modes overwrite this in camera.draw().
        if (viewport !== mainViewport) {
          camera.projectionMatrix = Camera.calculatePMatrix(gl, camera);
        }

        camera.draw(renderer.sensorPos);
        renderer.render(scene, camera);
      } finally {
        ServiceLocator.setActiveRenderCamera(null);
        this.activePass_ = null;
      }
    }

    // Restore whole-canvas GL state and main-camera-derived globals for
    // post-draw consumers (picking readback, worker culling, overlays)
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    scene.applyWorldShiftForCamera(mainViewport.camera);
    renderer.projectionCameraMatrix = mat4.mul(mat4.create(), mainViewport.camera.projectionMatrix, mainViewport.camera.matrixWorldInverse);
  }

  /**
   * (Re)applies the active pass's gl.viewport/scissor. Also called by the
   * renderer after an alt-canvas (screenshot) resize, and by draw code that
   * temporarily changed the scissor (GPU picking) via applyPassScissor().
   */
  applyPassViewport(gl: WebGL2RenderingContext): void {
    const viewport = this.activePass_;

    if (!viewport) {
      return;
    }

    this.updateRects_(gl);

    const isPipMainPane = this.layout_ === ViewportLayout.PIP && viewport === this.viewports_[0];

    viewport.camera.viewport = isPipMainPane ? null : { ...viewport.rect };

    const rect = viewport.rect;

    gl.viewport(rect.x, rect.y, rect.width, rect.height);
    gl.scissor(rect.x, rect.y, rect.width, rect.height);
    gl.enable(gl.SCISSOR_TEST);
  }

  /**
   * Restores the scissor state expected by the current render pass. Draw code
   * that narrows the scissor (e.g. 1x1 GPU picking) must call this instead of
   * gl.disable(SCISSOR_TEST) so multi-view passes stay clipped to their pane.
   */
  applyPassScissor(gl: WebGL2RenderingContext): void {
    const viewport = this.activePass_;

    if (!viewport || !this.isMultiViewActive()) {
      gl.disable(gl.SCISSOR_TEST);

      return;
    }

    const rect = viewport.rect;

    gl.scissor(rect.x, rect.y, rect.width, rect.height);
    gl.enable(gl.SCISSOR_TEST);
  }

  /**
   * True while a secondary (non-main) viewport pass is rendering. The sun and
   * godrays pipeline is only run for the main pane (their screen-space math
   * assumes the full canvas and they are visual garnish in a small pane).
   */
  isSecondaryRenderPass(): boolean {
    return this.activePass_ !== null && this.activePass_ !== this.viewports_[0];
  }

  /**
   * True when any rendered camera (main or secondary) is in the given mode.
   * Plugins use this to keep GPU resources alive while a secondary pane needs
   * them even though the main camera is in a different mode.
   */
  isCameraTypeActive(type: CameraType): boolean {
    if (ServiceLocator.getMainCamera()?.cameraType === type) {
      return true;
    }

    return this.isMultiViewActive() && this.viewports_.some((viewport) => viewport.isVisible && viewport.camera.cameraType === type);
  }

  /** Viewport under the given canvas coordinates (y from TOP), topmost first. */
  viewportAt(canvasX: number, canvasY: number, gl: WebGL2RenderingContext): Viewport | null {
    if (!this.isMultiViewActive()) {
      return this.getMainViewport();
    }

    const glY = gl.drawingBufferHeight - canvasY;

    // Iterate in reverse so overlays (PIP) win over the base pane
    for (let i = this.viewports_.length - 1; i >= 0; i--) {
      const viewport = this.viewports_[i];

      if (!viewport.isVisible) {
        continue;
      }
      const rect = viewport.rect;

      if (canvasX >= rect.x && canvasX < rect.x + rect.width && glY >= rect.y && glY < rect.y + rect.height) {
        return viewport;
      }
    }

    return this.getMainViewport();
  }

  private isSatelliteFocusedType_(type: CameraType): boolean {
    return type === CameraType.FIXED_TO_SAT_ECI || type === CameraType.FIXED_TO_SAT_LVLH || type === CameraType.SATELLITE_FIRST_PERSON;
  }

  private createSecondary_(): Viewport {
    const camera = new Camera();

    // Intentionally NOT calling camera.init(): the secondary camera must not
    // register its own keyboard handlers (input routing owns dispatch).
    camera.state.zoomLevel = settingsManager.initZoomLevel ?? 0.6825;
    camera.state.zoomTarget = camera.state.zoomLevel;

    const viewport = new Viewport('secondary', camera);

    this.viewports_ = [this.viewports_[0], viewport];

    return viewport;
  }

  private configurePipCamera_(camera: Camera): void {
    this.applySecondaryCameraType_(camera, CameraType.FIXED_TO_SAT_LVLH);
  }

  /**
   * Switches the secondary pane's camera mode (Shift+1..9 and the layout menu).
   * Satellite-focused modes get the close-up snap configuration so the pane
   * follows the shared selection. Returns false when there is no secondary pane.
   */
  setSecondaryCameraType(type: CameraType): boolean {
    const secondary = this.getSecondaryViewport();

    if (!secondary) {
      return false;
    }

    this.applySecondaryCameraType_(secondary.camera, type);

    return true;
  }

  private applySecondaryCameraType_(camera: Camera, type: CameraType): void {
    camera.cameraType = type;
    if (this.isSatelliteFocusedType_(type)) {
      camera.state.camZoomSnappedOnSat = true;
      camera.state.camAngleSnappedOnSat = false;
      camera.state.ftsRotateReset = true;
      camera.state.camDistBuffer = settingsManager.minDistanceFromSatellite ?? (100 as Kilometers);
    }
  }

  private destroySecondary_(): void {
    const secondary = this.getSecondaryViewport();

    if (!secondary) {
      return;
    }

    // Run the active mode delegate's onExit so static overrides
    // (e.g. ColorSchemeManager.selectedColorOverride) don't leak
    secondary.camera.deactivateModeDelegate();
    this.viewports_ = this.viewports_.slice(0, 1);
  }

  private updateRects_(gl: WebGL2RenderingContext): void {
    const bufferWidth = gl.drawingBufferWidth;
    const bufferHeight = gl.drawingBufferHeight;
    const usable = {
      x: Math.round(this.insets.left),
      y: Math.round(this.insets.bottom),
      width: Math.max(1, bufferWidth - Math.round(this.insets.left) - Math.round(this.insets.right)),
      height: Math.max(1, bufferHeight - Math.round(this.insets.bottom) - Math.round(this.insets.top)),
    };
    const mainViewport = this.viewports_[0];
    const secondary = this.viewports_[1];

    switch (this.layout_) {
      case ViewportLayout.SPLIT_HORIZONTAL: {
        const gap = ViewportManager.DIVIDER_GAP_PX_;
        const splitX = Math.round(usable.width * this.splitFraction_);

        mainViewport.rect = { x: usable.x, y: usable.y, width: Math.max(1, splitX - gap / 2), height: usable.height };
        if (secondary) {
          const secondaryX = usable.x + splitX + gap / 2;

          secondary.rect = { x: secondaryX, y: usable.y, width: Math.max(1, usable.x + usable.width - secondaryX), height: usable.height };
        }
        break;
      }
      case ViewportLayout.PIP: {
        mainViewport.rect = { x: 0, y: 0, width: bufferWidth, height: bufferHeight };
        if (secondary) {
          const margin = ViewportManager.PIP_MARGIN_PX_;
          const width = Math.round(Math.max(ViewportManager.PIP_MIN_WIDTH_PX_, bufferWidth * ViewportManager.PIP_WIDTH_FRACTION_));
          const height = Math.round(width / ViewportManager.PIP_ASPECT_);
          const x = Math.max(0, bufferWidth - Math.round(this.insets.right) - margin - width);
          const y = Math.max(0, Math.round(this.insets.bottom) + margin);

          secondary.rect = { x, y, width: Math.min(width, bufferWidth), height: Math.min(height, bufferHeight) };
        }
        break;
      }
      default:
        mainViewport.rect = { x: 0, y: 0, width: bufferWidth, height: bufferHeight };
    }
  }
}
