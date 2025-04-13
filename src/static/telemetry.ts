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
    timestamp: number;
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
  private static gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private static canvas: HTMLCanvasElement | null = null;
  private static appVersion: string = VERSION;
  private static lastError: string = 'NO_ERROR';
  private static contextLost: boolean = false;
  static isInitialized: boolean = false;

  /**
   * Initialize with references to WebGL context and canvas
   */
  static initialize(gl: WebGLRenderingContext | WebGL2RenderingContext, canvas: HTMLCanvasElement, appVersion?: string): void {
    this.gl = gl;
    this.canvas = canvas;
    if (appVersion) {
      this.appVersion = appVersion;
    }

    // Set up minimal context loss detection
    if (canvas) {
      canvas.addEventListener('webglcontextlost', () => {
        this.contextLost = true;
      });

      canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost = false;
      });
    }

    this.isInitialized = true;
  }

  /**
   * Send error data when an error occurs
   */
  static sendErrorData(e: Error, funcName: string, additionalData?: Record<string, any>): void {
    if (!this.gl || !this.canvas) {
      console.error('Cannot send telemetry: WebGL context or canvas not initialized');

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
          version: this.appVersion,
          timestamp: new Date().toISOString(),
          ...additionalData?.application,
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
          lastInputType: additionalData.lastInputType,
          lastInputTime: additionalData.lastInputTime,
        };
      }

      // Send the data
      this.sendTelemetryData(telemetryData);

    } catch (err) {
      console.error('Error preparing telemetry:', err);
    }
  }

  /**
   * Collect WebGL context information
   */
  private static collectWebGLInfo(): WebGLTelemetryData['webGLInfo'] {
    if (!this.gl) {
      return {
        contextType: 'unknown',
        vendor: 'unknown',
        renderer: 'unknown',
        version: 'unknown',
        extensions: [],
        maxTextureSize: 0,
        contextLost: this.contextLost,
        lastError: this.lastError,
      };
    }

    const gl = this.gl;
    const isWebGL2 = 'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    // Check for any WebGL errors
    const error = gl.getError();

    if (error !== gl.NO_ERROR) {
      switch (error) {
        case gl.INVALID_ENUM: this.lastError = 'INVALID_ENUM'; break;
        case gl.INVALID_VALUE: this.lastError = 'INVALID_VALUE'; break;
        case gl.INVALID_OPERATION: this.lastError = 'INVALID_OPERATION'; break;
        case gl.INVALID_FRAMEBUFFER_OPERATION:
          this.lastError = 'INVALID_FRAMEBUFFER_OPERATION';
          break;
        case gl.OUT_OF_MEMORY:
          this.lastError = 'OUT_OF_MEMORY';
          break;
        case gl.CONTEXT_LOST_WEBGL:
          this.lastError = 'CONTEXT_LOST_WEBGL';
          break;
        default: this.lastError = `Unknown error (${error})`;
      }
    }

    return {
      contextType: isWebGL2 ? 'webgl2' : 'webgl',
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      version: gl.getParameter(gl.VERSION),
      extensions: gl.getSupportedExtensions() || [],
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      contextLost: this.contextLost,
      lastError: this.lastError,
    };
  }

  /**
   * Collect system information
   */
  private static collectSystemInfo(): WebGLTelemetryData['system'] {
    const connection = (navigator as any).connection;

    const systemInfo: WebGLTelemetryData['system'] = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
    };

    // Add memory info if available
    if ((performance as any).memory) {
      systemInfo.memoryInfo = {
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
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
    if (!this.canvas || !this.gl) {
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

    const attributes = this.gl.getContextAttributes() || {};

    return {
      width: this.canvas.width,
      height: this.canvas.height,
      clientWidth: this.canvas.clientWidth,
      clientHeight: this.canvas.clientHeight,
      isFullscreen: document.fullscreenElement === this.canvas,
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
    fetch(settingsManager.telemetryServer, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((err) => {
      console.error('Error sending telemetry:', err);
    });
  }

  /**
   * Capture current performance snapshot
   * Call this method immediately before sending error data for better context
   */
  static capturePerformanceSnapshot(): Record<string, any> {
    if (!this.gl) {
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
  static addAppState(scene: string, lastAction?: string): Record<string, any> {
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
  static addAssetState(loaded: number, failed: number, failedAssets?: string[]): Record<string, any> {
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
  static addInteractionData(inputType: 'mouse' | 'touch' | 'keyboard' | 'gamepad' | 'none'): Record<string, any> {
    return {
      lastInputType: inputType,
      lastInputTime: Date.now(),
    };
  }
}
