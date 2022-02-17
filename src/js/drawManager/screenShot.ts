import { keepTrackApi } from '../api/keepTrackApi';

export const screenShot = () => {
  const { drawManager } = keepTrackApi.programs;
  if (!settingsManager.queuedScreenshot) {
    drawManager.resizeCanvas();
    settingsManager.queuedScreenshot = true;
  } else {
    let link = document.createElement('a');
    link.download = 'keeptrack.png';

    let d = new Date();
    let n = d.getUTCFullYear();
    let copyrightStr = !settingsManager.copyrightOveride ? `©${n} KEEPTRACK.SPACE` : '';

    link.href = watermarkedDataUrl(drawManager.canvas, copyrightStr);
    link.click();
    settingsManager.screenshotMode = false;
    settingsManager.queuedScreenshot = false;
    drawManager.resizeCanvas();
  }
};

export const watermarkedDataUrl = (canvas: HTMLCanvasElement, text: string) => {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  let cw = (tempCanvas.width = canvas.width);
  let ch = (tempCanvas.height = canvas.height);
  tempCtx.drawImage(canvas, 0, 0);
  tempCtx.font = '24px nasalization';
  let textWidth = tempCtx.measureText(text).width;
  tempCtx.globalAlpha = 1.0;
  tempCtx.fillStyle = 'white';
  tempCtx.fillText(text, cw - textWidth - 30, ch - 30);

  if (settingsManager.classificationStr !== '') {
    tempCtx.font = '24px nasalization';
    textWidth = tempCtx.measureText(settingsManager.classificationStr).width;
    tempCtx.globalAlpha = 1.0;
    switch (settingsManager.classificationStr) {
      case 'Top Secret//SCI':
        tempCtx.fillStyle = '#fce93a';
        break;
      case 'Top Secret':
        tempCtx.fillStyle = '#ff8c00';
        break;
      case 'Secret':
        tempCtx.fillStyle = '#ff0000';
        break;
      case 'Confidential':
        tempCtx.fillStyle = '#0033a0';
        break;
      case 'CUI':
        tempCtx.fillStyle = '#512b85';
        break;
      case 'Unclassified':
        tempCtx.fillStyle = '#007a33';
        break;
      default:
        throw new Error('Invalid classification');
    }
    tempCtx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, ch - 20);
    tempCtx.fillText(settingsManager.classificationStr, cw / 2 - textWidth, 34);
  }

  document.body.appendChild(tempCanvas);
  let image = tempCanvas.toDataURL();
  tempCanvas.parentNode.removeChild(tempCanvas);
  return image;
};
