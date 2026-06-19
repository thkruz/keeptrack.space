/**
 * plot-download.ts - Shared chart PNG export with logo watermark for the
 * plot-analysis charts. Renders the echarts canvas to a PNG and stamps the
 * KeepTrack primary (and optional secondary) logo into the corner, honoring the
 * copyright-override and secondary-logo settings. Previously copy-pasted in both
 * time2lon and inc2lon; centralized here so the two stay in sync.
 */

import type * as echarts from 'echarts';

const PADDING_X = 40;
const PADDING_Y = 50;
/** Logo height as a fraction of the chart height, floored so it never vanishes. */
const LOGO_HEIGHT_FRACTION = 0.06;
const LOGO_HEIGHT_MIN = 40;

export class PlotWatermark {
  private readonly logo_ = new Image();
  private readonly secondaryLogo_ = new Image();

  constructor() {
    this.logo_.src = `${settingsManager.installDirectory}img/logo-primary.png`;
    if (settingsManager.isShowSecondaryLogo) {
      this.secondaryLogo_.src = `${settingsManager.installDirectory}img/logo-secondary.png`;
    }
  }

  /** Exports the chart to a PNG with the logo watermark and triggers a download. */
  download(chart: echarts.ECharts, filename: string): void {
    const chartDataUrl = chart.getDataURL({
      type: 'png',
      backgroundColor: '#1f1f1f',
      pixelRatio: 2,
    });

    const chartImg = new Image();

    chartImg.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = chartImg.width;
      canvas.height = chartImg.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      // Draw chart, then the logo watermark in the top-left corner.
      ctx.drawImage(chartImg, 0, 0);
      this.drawWatermark_(ctx, canvas.height);

      const link = document.createElement('a');

      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    chartImg.src = chartDataUrl;
  }

  private drawWatermark_(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    const logoHeight = Math.max(LOGO_HEIGHT_MIN, canvasHeight * LOGO_HEIGHT_FRACTION);

    if (settingsManager.copyrightOveride || !this.logo_.complete || this.logo_.naturalWidth === 0) {
      return;
    }

    const logoWidth = this.logo_.width * (logoHeight / this.logo_.height);

    if (settingsManager.isShowSecondaryLogo && this.secondaryLogo_.complete && this.secondaryLogo_.naturalWidth > 0) {
      const secLogoWidth = this.secondaryLogo_.width * (logoHeight / this.secondaryLogo_.height);

      ctx.drawImage(this.secondaryLogo_, PADDING_X, PADDING_Y, secLogoWidth, logoHeight);
      ctx.drawImage(this.logo_, PADDING_X + secLogoWidth + PADDING_X, PADDING_Y, logoWidth, logoHeight);
    } else {
      ctx.drawImage(this.logo_, PADDING_X, PADDING_Y, logoWidth, logoHeight);
    }
  }
}
