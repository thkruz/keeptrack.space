import { keepTrackApi } from '@app/keepTrackApi';
import type { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { VERSION } from '@app/settings/version';

interface WebGLTelemetryData {
  // Basic Error Information
  error: {
    name: string;
    message: string;
    stack?: string;
    funcName: string;
  };

  // WebGL Context Information
  webGLInfo: {
    contextType: string; // 'webgl' or 'webgl2'
    vendor: string;
    renderer: string;
    version: string;
    extensions: string[];
    maxTextureSize: number;
    contextLost: boolean;
    lastError: string;
  };

  // System Information
  system: {
    userAgent: string;
    platform: string;
    language: string;
    hardwareConcurrency: number;
    devicePixelRatio: number;
    screenResolution: string;
    colorDepth: number;
    memoryInfo?: {
      jsHeapSizeLimit?: number;
      totalJSHeapSize?: number;
      usedJSHeapSize?: number;
    };
    connectionType?: string;
    downlink?: number;
  };

  // Canvas Information
  canvas: {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
    isFullscreen: boolean;
    contextAttributes: {
      alpha: boolean;
      antialias: boolean;
      depth: boolean;
      stencil: boolean;
      preserveDrawingBuffer: boolean;
    };
  };

  // Application State
  application: {
    version: string;
    timestamp: string;
    currentScene?: string;
    assetLoadState?: {
      loaded: number;
      failed: number;
      failedAssets?: string[];
    };
    lastAction?: string;
    renderState?: {
      fps?: number;
      activeShaders?: string[];
      numTextures?: number;
      numBuffers?: number;
    };
    primarySatObj?: object;
    secondarySatObj?: object | null;
    currentSensor?: object[];
    plugins: Record<string, boolean>;
    simulationTime?: object;
    [key: string]: unknown; // Additional custom data
  };

  // User Interaction
  interaction?: {
    lastInputType?: 'mouse' | 'touch' | 'keyboard' | 'gamepad' | 'none';
    lastInputTime?: number;
  };
}

/**
 * Simple on-demand telemetry for WebGL applications.
 * Only collects data when explicitly called - no ongoing monitoring.
 */
export class Telemetry {
  static isInitialized: boolean = false;
  private static readonly minimumTelemetryInterval = 10 * 60 * 1000; // 10 minutes
  private static gl_: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private static canvas_: HTMLCanvasElement | null = null;
  private static appVersion_: string = VERSION;
  private static lastError_: string = 'NO_ERROR';
  private static contextLost_: boolean = false;
  private static lastTimestamp_: number = 0;


  /**
   * Initialize with references to WebGL context and canvas
   */
  static initialize(gl: WebGLRenderingContext | WebGL2RenderingContext, canvas: HTMLCanvasElement, appVersion?: string): void {
    this.gl_ = gl;
    this.canvas_ = canvas;
    if (appVersion) {
      this.appVersion_ = appVersion;
    }

    // Set up minimal context loss detection
    if (canvas) {
      canvas.addEventListener('webglcontextlost', () => {
        this.contextLost_ = true;
      });

      canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost_ = false;
      });
    }

    this.isInitialized = true;
  }

  /**
   * Send error data when an error occurs
   */
  static sendErrorData(e: Error, funcName: string, additionalData?: Record<string, unknown>): void {
    if (!this.gl_ || !this.canvas_) {
      // eslint-disable-next-line no-console
      console.debug('Cannot send telemetry: WebGL context or canvas not initialized');

      return;
    }

    try {
      const telemetryData: WebGLTelemetryData = {
        error: {
          name: e.name,
          message: e.message,
          stack: e.stack,
          funcName,
        },
        webGLInfo: this.collectWebGLInfo(),
        system: this.collectSystemInfo(),
        canvas: this.collectCanvasInfo(),
        application: {
          version: this.appVersion_,
          timestamp: new Date().toISOString(),
          ...additionalData?.application as Record<string, unknown>,
          primarySatObj: (<SelectSatManager>keepTrackApi.getPluginByName('SelectSatManager'))?.primarySatObj,
          secondarySatObj: (<SelectSatManager>keepTrackApi.getPluginByName('SelectSatManager'))?.secondarySatObj,
          currentSensor: keepTrackApi.getSensorManager()?.currentSensors,
          plugins: settingsManager.plugins,
          simulationTime: keepTrackApi.getTimeManager().simulationTimeObj,
        },
      };

      // Add optional user interaction data if available
      if (additionalData?.lastInputType || additionalData?.lastInputTime) {
        telemetryData.interaction = {
          lastInputType: additionalData.lastInputType as 'mouse' | 'touch' | 'keyboard' | 'gamepad' | 'none',
          lastInputTime: additionalData.lastInputTime as number,
        };
      }

      // Send the data
      this.sendTelemetryData(telemetryData);

    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug('Error preparing telemetry:', err);
    }
  }

  /**
   * Collect WebGL context information
   */
  private static collectWebGLInfo(): WebGLTelemetryData['webGLInfo'] {
    if (!this.gl_) {
      return {
        contextType: 'unknown',
        vendor: 'unknown',
        renderer: 'unknown',
        version: 'unknown',
        extensions: [],
        maxTextureSize: 0,
        contextLost: this.contextLost_,
        lastError: this.lastError_,
      };
    }

    const gl = this.gl_;
    const isWebGL2 = 'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    // Check for any WebGL errors
    const error = gl.getError();

    if (error !== gl.NO_ERROR) {
      switch (error) {
        case gl.INVALID_ENUM:
          this.lastError_ = 'INVALID_ENUM';
          break;
        case gl.INVALID_VALUE:
          this.lastError_ = 'INVALID_VALUE';
          break;
        case gl.INVALID_OPERATION:
          this.lastError_ = 'INVALID_OPERATION';
          break;
        case gl.INVALID_FRAMEBUFFER_OPERATION:
          this.lastError_ = 'INVALID_FRAMEBUFFER_OPERATION';
          break;
        case gl.OUT_OF_MEMORY:
          this.lastError_ = 'OUT_OF_MEMORY';
          break;
        case gl.CONTEXT_LOST_WEBGL:
          this.lastError_ = 'CONTEXT_LOST_WEBGL';
          break;
        default: this.lastError_ = `Unknown error (${error})`;
      }
    }

    return {
      contextType: isWebGL2 ? 'webgl2' : 'webgl',
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      version: gl.getParameter(gl.VERSION),
      extensions: gl.getSupportedExtensions() || [],
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      contextLost: this.contextLost_,
      lastError: this.lastError_,
    };
  }

  /**
   * Collect system information
   */
  private static collectSystemInfo(): WebGLTelemetryData['system'] {
    const connection = (navigator as Navigator & { connection?: unknown }).connection as {
      effectiveType?: string;
      downlink?: number;
    };

    const systemInfo: WebGLTelemetryData['system'] = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
    };

    const performanceData = performance as {
      memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
      };
      deviceMemory?: number;
    };

    // Add memory info if available
    if (performanceData.memory) {
      systemInfo.memoryInfo = {
        jsHeapSizeLimit: performanceData.memory.jsHeapSizeLimit,
        totalJSHeapSize: performanceData.memory.totalJSHeapSize,
        usedJSHeapSize: performanceData.memory.usedJSHeapSize,
      };
    }

    // Add connection info if available
    if (connection) {
      systemInfo.connectionType = connection.effectiveType;
      systemInfo.downlink = connection.downlink;
    }

    return systemInfo;
  }

  /**
   * Collect canvas information
   */
  private static collectCanvasInfo(): WebGLTelemetryData['canvas'] {
    if (!this.canvas_ || !this.gl_) {
      return {
        width: 0,
        height: 0,
        clientWidth: 0,
        clientHeight: 0,
        isFullscreen: false,
        contextAttributes: {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false,
        },
      };
    }

    const attributes = this.gl_.getContextAttributes() || {};

    return {
      width: this.canvas_.width,
      height: this.canvas_.height,
      clientWidth: this.canvas_.clientWidth,
      clientHeight: this.canvas_.clientHeight,
      isFullscreen: document.fullscreenElement === this.canvas_,
      contextAttributes: {
        alpha: attributes.alpha || false,
        antialias: attributes.antialias || false,
        depth: attributes.depth || false,
        stencil: attributes.stencil || false,
        preserveDrawingBuffer: attributes.preserveDrawingBuffer || false,
      },
    };
  }

  /**
   * Send telemetry data to the server
   */
  private static sendTelemetryData(data: WebGLTelemetryData): void {
    // Avoid sending telemetry too frequently
    if (Date.now() - this.lastTimestamp_ < Telemetry.minimumTelemetryInterval) {
      return;
    }

    fetch(settingsManager.telemetryServer, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.debug('Error sending telemetry:', err);
    });

    this.lastTimestamp_ = Date.now();
  }

  /**
   * Capture current performance snapshot
   * Call this method immediately before sending error data for better context
   */
  static capturePerformanceSnapshot(): Record<string, unknown> {
    if (!this.gl_) {
      return {};
    }

    /*
     * You can add custom measurements here based on your application needs
     * This is deliberately minimal and focused on key metrics
     */
    return {
      application: {
        renderState: {
          fps: 1000 / keepTrackApi.getRenderer().dt,
        },
      },
    };
  }

  /**
   * Add custom application state to the telemetry data
   */
  static addAppState(scene: string, lastAction?: string): Record<string, unknown> {
    return {
      application: {
        currentScene: scene,
        lastAction,
      },
    };
  }

  /**
   * Add asset loading state to the telemetry data
   */
  static addAssetState(loaded: number, failed: number, failedAssets?: string[]): Record<string, unknown> {
    return {
      application: {
        assetLoadState: {
          loaded,
          failed,
          failedAssets,
        },
      },
    };
  }

  /**
   * Add user interaction data
   */
  static addInteractionData(inputType: 'mouse' | 'touch' | 'keyboard' | 'gamepad' | 'none'): Record<string, unknown> {
    return {
      lastInputType: inputType,
      lastInputTime: Date.now(),
    };
  }
}
