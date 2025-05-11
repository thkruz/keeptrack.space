export const initializeSplashScreen = () => {
  const splashScreen = document.createElement('div');

  splashScreen.style.position = 'absolute';
  splashScreen.style.top = '0';
  splashScreen.style.left = '0';
  splashScreen.style.width = '100%';
  splashScreen.style.height = '100%';
  splashScreen.style.backgroundColor = 'rgba(0, 0, 0, 1)';
  splashScreen.style.color = 'white';
  splashScreen.style.display = 'flex';
  splashScreen.style.alignItems = 'center';
  splashScreen.style.justifyContent = 'center';
  splashScreen.style.zIndex = '10000';

  // Create a container for splash content
  const splashContent = document.createElement('div');

  splashContent.style.display = 'flex';
  splashContent.style.flexDirection = 'column';
  splashContent.style.alignItems = 'center';

  // "Powered by" text
  const poweredBy = document.createElement('div');

  poweredBy.innerText = 'Powered by';
  poweredBy.style.fontSize = '20px';
  poweredBy.style.marginBottom = '12px';
  poweredBy.style.opacity = '0.8';

  // DORIS text
  const dorisText = document.createElement('div');

  dorisText.innerText = 'DORIS';
  dorisText.style.fontSize = '64px';
  dorisText.style.fontWeight = 'bold';
  dorisText.style.letterSpacing = '0.2em';
  dorisText.style.textShadow = '0 2px 16px #000, 0 0 8px #fff4';

  // Loading text
  const loadingText = document.createElement('div');

  loadingText.innerText = 'A not-so-intelligent, definitely-overambitious, and surprisingly useful small space engine.';
  loadingText.style.fontSize = '16px';
  loadingText.style.marginTop = '14px';
  loadingText.style.opacity = '0.7';

  // Version text
  const versionText = document.createElement('div');

  versionText.innerText = 'v1.0.0';
  versionText.style.position = 'absolute';
  versionText.style.bottom = '12px';
  versionText.style.left = '12px';
  versionText.style.fontSize = '14px';
  versionText.style.opacity = '0.7';
  versionText.style.pointerEvents = 'none';
  splashScreen.appendChild(versionText);

  // Copyright message
  const copyright = document.createElement('div');

  copyright.innerHTML = `
DORIS™ and Definitely Overengineered Render & Input System™ are trademarks of Kruczek Labs LLC.<br>
This instance is licensed under the GNU AGPL v3.0. Attribution, source access, and this notice must remain visible.<br>
No commercial license has been granted, and no compensation has been provided to the rights holder.<br>
Unauthorized use, rebranding, or removal of attribution may violate trademark and open source license terms.<br>
© 2025 Kruczek Labs LLC. All rights reserved. See LICENSE for full terms.`;
  copyright.style.position = 'absolute';
  copyright.style.bottom = '12px';
  copyright.style.left = '0';
  copyright.style.width = '100%';
  copyright.style.textAlign = 'center';
  copyright.style.fontSize = '12px';
  copyright.style.opacity = '0.7';
  copyright.style.pointerEvents = 'none';

  splashContent.appendChild(poweredBy);
  splashContent.appendChild(dorisText);
  splashContent.appendChild(loadingText);
  splashScreen.appendChild(splashContent);
  splashScreen.appendChild(copyright);

  document.body.appendChild(splashScreen);

  return splashScreen;
};
