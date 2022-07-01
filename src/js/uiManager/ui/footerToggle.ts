import { getEl } from '@app/js/lib/helpers';

let isFooterShown = true;
export const footerToggle = function () {
  if (isFooterShown) {
    isFooterShown = false;
    getEl('sat-infobox')?.classList.add('sat-infobox-fullsize');
    getEl('nav-footer')?.classList.add('footer-slide-trans');
    getEl('nav-footer')?.classList.remove('footer-slide-up');
    getEl('nav-footer')?.classList.add('footer-slide-down');
    getEl('nav-footer-toggle').innerHTML = '&#x25B2;';
  } else {
    isFooterShown = true;
    getEl('sat-infobox')?.classList.remove('sat-infobox-fullsize');
    getEl('nav-footer')?.classList.add('footer-slide-trans');
    getEl('nav-footer')?.classList.remove('footer-slide-down');
    getEl('nav-footer')?.classList.add('footer-slide-up');
    getEl('nav-footer-toggle').innerHTML = '&#x25BC;';
  }
  // After 1 second the transition should be complete so lets stop moving slowly
  setTimeout(() => {
    getEl('nav-footer')?.classList.remove('footer-slide-trans');
  }, 1000);
};
