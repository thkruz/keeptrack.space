import astronauts1920Png from '@app/img/wallpaper/astronauts-1920.png';
import astronauts21920Png from '@app/img/wallpaper/astronauts2-1920.png';
import astronauts23840Png from '@app/img/wallpaper/astronauts2-3840.png';
import astronauts3840Png from '@app/img/wallpaper/astronauts-3840.png';
import commandCenter1920Png from '@app/img/wallpaper/commandCenter-1920.png';
import commandCenter3840Png from '@app/img/wallpaper/commandCenter-3840.png';
import controlModule1920Png from '@app/img/wallpaper/controlModule-1920.png';
import controlModule3840Png from '@app/img/wallpaper/controlModule-3840.png';
import domeInDesert1920Png from '@app/img/wallpaper/domeInDesert-1920.png';
import domeInDesert3840Png from '@app/img/wallpaper/domeInDesert-3840.png';
import domeInHawaii1920Png from '@app/img/wallpaper/domeInHawaii-1920.png';
import domeInHawaii3840Png from '@app/img/wallpaper/domeInHawaii-3840.png';
import domeInMountain1920Png from '@app/img/wallpaper/domeInMountain-1920.png';
import domeInMountain21920Png from '@app/img/wallpaper/domeInMountain2-1920.png';
import domeInMountain23840Png from '@app/img/wallpaper/domeInMountain2-3840.png';
import domeInMountain3840Png from '@app/img/wallpaper/domeInMountain-3840.png';
import domeInSnow1920Png from '@app/img/wallpaper/domeInSnow-1920.png';
import domeInSnow21920Png from '@app/img/wallpaper/domeInSnow2-1920.png';
import domeInSnow23840Png from '@app/img/wallpaper/domeInSnow2-3840.png';
import domeInSnow3840Png from '@app/img/wallpaper/domeInSnow-3840.png';
import domesOnGrassHill1920Png from '@app/img/wallpaper/domesOnGrassHill-1920.png';
import domesOnGrassHill3840Png from '@app/img/wallpaper/domesOnGrassHill-3840.png';
import fylingdales1920Png from '@app/img/wallpaper/fylingdales-1920.png';
import fylingdales21920Png from '@app/img/wallpaper/fylingdales2-1920.png';
import fylingdales23840Png from '@app/img/wallpaper/fylingdales2-3840.png';
import fylingdales3840Png from '@app/img/wallpaper/fylingdales-3840.png';
import icbm1920Png from '@app/img/wallpaper/icbm-1920.png';
import icbm3840Png from '@app/img/wallpaper/icbm-3840.png';
import iss1920Png from '@app/img/wallpaper/iss-1920.png';
import iss3840Png from '@app/img/wallpaper/iss-3840.png';
import launchpad1920Png from '@app/img/wallpaper/launchpad-1920.png';
import launchpad21920Png from '@app/img/wallpaper/launchpad2-1920.png';
import launchpad23840Png from '@app/img/wallpaper/launchpad2-3840.png';
import launchpad3840Png from '@app/img/wallpaper/launchpad-3840.png';
import militaryLaunch1920Png from '@app/img/wallpaper/militaryLaunch-1920.png';
import militaryLaunch3840Png from '@app/img/wallpaper/militaryLaunch-3840.png';
import mobileTel1920Png from '@app/img/wallpaper/mobileTel-1920.png';
import mobileTel3840Png from '@app/img/wallpaper/mobileTel-3840.png';
import radarDomeFall1920Png from '@app/img/wallpaper/radarDomeFall-1920.png';
import radarDomeFall3840Png from '@app/img/wallpaper/radarDomeFall-3840.png';
import radarOnHill1920Png from '@app/img/wallpaper/radarOnHill-1920.png';
import radarOnHill3840Png from '@app/img/wallpaper/radarOnHill-3840.png';
import slbm1920Png from '@app/img/wallpaper/slbm-1920.png';
import slbm21920Png from '@app/img/wallpaper/slbm2-1920.png';
import slbm23840Png from '@app/img/wallpaper/slbm2-3840.png';
import slbm3840Png from '@app/img/wallpaper/slbm-3840.png';

export const loadSplashScreen = (): void => {
  // //////////////////////////////////////////////////////////////////////////
  // Load Wallpaper
  // //////////////////////////////////////////////////////////////////////////
  // Set Background
  const backgrounds = [
    astronauts1920Png,
    astronauts3840Png,
    astronauts21920Png,
    astronauts23840Png,
    commandCenter1920Png,
    commandCenter3840Png,
    controlModule1920Png,
    controlModule3840Png,
    domeInDesert1920Png,
    domeInDesert3840Png,
    domeInHawaii1920Png,
    domeInHawaii3840Png,
    domeInMountain1920Png,
    domeInMountain3840Png,
    domeInMountain21920Png,
    domeInMountain23840Png,
    domeInSnow1920Png,
    domeInSnow3840Png,
    domeInSnow21920Png,
    domeInSnow23840Png,
    domesOnGrassHill1920Png,
    domesOnGrassHill3840Png,
    fylingdales1920Png,
    fylingdales3840Png,
    fylingdales21920Png,
    fylingdales23840Png,
    icbm1920Png,
    icbm3840Png,
    iss1920Png,
    iss3840Png,
    mobileTel1920Png,
    mobileTel3840Png,
    militaryLaunch1920Png,
    militaryLaunch3840Png,
    launchpad1920Png,
    launchpad3840Png,
    launchpad21920Png,
    launchpad23840Png,
    radarDomeFall1920Png,
    radarDomeFall3840Png,
    radarOnHill1920Png,
    radarOnHill3840Png,
    slbm1920Png,
    slbm3840Png,
    slbm21920Png,
    slbm23840Png,
  ];

  // Randomly load a splash screen - not a vulnerability
  const width = window.innerWidth > 1920 ? 1 : 0;
  const image = backgrounds[Math.floor(Math.random() * backgrounds.length) + width]; // NOSONAR
  const loadingDom = document.getElementById('loading-screen');

  loadingDom.style.backgroundImage = `url(${image})`;
  loadingDom.style.backgroundSize = 'cover';
  loadingDom.style.backgroundPosition = 'center';
  loadingDom.style.backgroundRepeat = 'no-repeat';

  for (let i = 0; i < backgrounds.length / 2; i += 2) {
    setTimeout(() => {
      const width = window.innerWidth > 1920 ? 1 : 0;
      new Image().src = backgrounds[Math.floor(Math.random() * backgrounds.length) + width]; // NOSONAR
    }, 5000 * i);
  }
};
