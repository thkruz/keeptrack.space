/**
 * recording-watermark.ts - burns the KeepTrack logo and keeptrack.space into screen recordings.
 *
 * The captured display stream plays in a hidden video element; each decoded frame is copied to a
 * compositing canvas and the pre-rendered brand overlay is drawn on top (one extra drawImage per
 * frame). `canvas.captureStream()` then feeds the MediaRecorder. Audio tracks of the source pass through.
 * Any failure returns the source stream unchanged, so a recording is never lost to branding.
 * https://keeptrack.space
 */

import { drawBrandMark, getBrandLogo, preloadBrandLogo } from '@app/engine/utils/branding';

export interface WatermarkedStream {
  stream: MediaStream;
  /** Stops the frame loop and releases the hidden video and canvas. Does not stop the source tracks. */
  dispose: () => void;
}

type VideoWithFrameCallback = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };

const FALLBACK_FPS = 30;

/** Renders the brand mark onto a transparent canvas the size of the frame (done on size change only). */
const renderOverlay = (width: number, height: number): HTMLCanvasElement | null => {
  const overlay = document.createElement('canvas');

  overlay.width = width;
  overlay.height = height;
  const ctx = overlay.getContext('2d');

  if (!ctx) {
    return null;
  }
  drawBrandMark(ctx, width, height);

  return overlay;
};

/**
 * Returns a stream whose video carries the brand mark, or null when compositing is unavailable
 * (no video track, no canvas capture, or a setup error); callers then record the source as is.
 */
export const createWatermarkedStream = (source: MediaStream, installDirectory = ''): WatermarkedStream | null => {
  try {
    const videoTrack = source.getVideoTracks?.()[0];

    if (!videoTrack || typeof document === 'undefined') {
      return null;
    }
    const canvas = document.createElement('canvas');

    if (typeof canvas.captureStream !== 'function') {
      return null;
    }
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      return null;
    }
    preloadBrandLogo(installDirectory);

    const settings = videoTrack.getSettings?.() ?? {};
    const fps = settings.frameRate && settings.frameRate > 0 ? settings.frameRate : FALLBACK_FPS;
    const video = document.createElement('video') as VideoWithFrameCallback;

    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([videoTrack]);

    let overlay: HTMLCanvasElement | null = null;
    let overlayKey = '';
    let overlayHadLogo = false;
    let stopped = false;
    let rafId = 0;

    const draw = () => {
      if (stopped) {
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;

      if (w > 0 && h > 0) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const hasLogo = !!getBrandLogo();
        const key = `${w}x${h}`;

        // Rebuild the overlay on resize, and once more when the logo finishes loading.
        if (key !== overlayKey || (hasLogo && !overlayHadLogo)) {
          overlay = renderOverlay(w, h);
          overlayKey = key;
          overlayHadLogo = hasLogo;
        }
        ctx.drawImage(video, 0, 0, w, h);
        if (overlay) {
          ctx.drawImage(overlay, 0, 0);
        }
      }
      schedule();
    };

    const schedule = () => {
      if (stopped) {
        return;
      }
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(draw);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    };

    canvas.width = settings.width ?? 1280;
    canvas.height = settings.height ?? 720;
    const out = canvas.captureStream(fps);

    source.getAudioTracks?.().forEach((track) => out.addTrack(track));
    void video.play().catch(() => undefined);
    schedule();

    return {
      stream: out,
      dispose: () => {
        stopped = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        out.getVideoTracks().forEach((track) => {
          track.stop();
        });
        video.pause();
        video.srcObject = null;
      },
    };
  } catch {
    return null;
  }
};
