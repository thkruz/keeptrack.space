import { syncInitialUtilityState, syncUtilityFooterState } from '@app/app/ui/plugin-drawer-helpers';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/**
 * Top-menu utility icons (sound, ...) are copies of their nav button. The copy
 * must follow the nav button's state and image whichever code path changed it
 * (keyboard shortcut, click, programmatic mute), not toggle on its own clicks.
 */
describe('utility footer top-menu sync', () => {
  const ON_SRC = 'sound-on.png';
  const OFF_SRC = 'sound-off.png';

  const buildDom_ = (): { navBtn: HTMLElement; navImg: HTMLImageElement; footerIcon: HTMLElement; footerImg: HTMLImageElement } => {
    document.body.innerHTML = `
      <ul id="nav-top-right">
        <li><a id="sound-btn" class="top-menu-icons bmenu-item-selected"><div class="top-menu-icons"><img id="sound-icon" src="${ON_SRC}" /></div></a></li>
      </ul>
      <div id="drawer-utility-footer">
        <div class="drawer-utility-icon bmenu-item-selected" data-top-menu-id="sound-btn"><img src="${ON_SRC}" alt="Sound" /></div>
      </div>`;

    return {
      navBtn: document.getElementById('sound-btn') as HTMLElement,
      navImg: document.getElementById('sound-icon') as HTMLImageElement,
      footerIcon: document.querySelector('.drawer-utility-icon') as HTMLElement,
      footerImg: document.querySelector('.drawer-utility-icon img') as HTMLImageElement,
    };
  };

  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mirrors a mute made outside the footer: classes and the sound-off image', () => {
    const { navBtn, navImg, footerIcon, footerImg } = buildDom_();

    // What SoundToggle.onMuteChanged_ does on Shift+M.
    navImg.setAttribute('src', OFF_SRC);
    navBtn.classList.remove('bmenu-item-selected');
    navBtn.classList.add('bmenu-item-error');

    syncUtilityFooterState();

    expect(footerIcon.classList.contains('bmenu-item-selected')).toBe(false);
    expect(footerIcon.classList.contains('bmenu-item-error')).toBe(true);
    expect(footerImg.getAttribute('src')).toBe(OFF_SRC);
  });

  it('mirrors an unmute back to the selected state and sound-on image', () => {
    const { navBtn, navImg, footerIcon, footerImg } = buildDom_();

    navImg.setAttribute('src', OFF_SRC);
    navBtn.classList.remove('bmenu-item-selected');
    navBtn.classList.add('bmenu-item-error');
    syncUtilityFooterState();

    navImg.setAttribute('src', ON_SRC);
    navBtn.classList.add('bmenu-item-selected');
    navBtn.classList.remove('bmenu-item-error');
    syncUtilityFooterState();

    expect(footerIcon.classList.contains('bmenu-item-selected')).toBe(true);
    expect(footerIcon.classList.contains('bmenu-item-error')).toBe(false);
    expect(footerImg.getAttribute('src')).toBe(ON_SRC);
  });

  it('initial sync applies the same mirror (a muted-at-load nav button shows muted)', () => {
    const { navBtn, navImg, footerIcon, footerImg } = buildDom_();

    navImg.setAttribute('src', OFF_SRC);
    navBtn.classList.remove('bmenu-item-selected');

    syncInitialUtilityState();

    expect(footerIcon.classList.contains('bmenu-item-selected')).toBe(false);
    expect(footerImg.getAttribute('src')).toBe(OFF_SRC);
  });

  it('leaves the footer untouched when its nav button is missing', () => {
    const { navBtn, footerIcon } = buildDom_();

    navBtn.parentElement?.remove();
    syncUtilityFooterState();

    expect(footerIcon.classList.contains('bmenu-item-selected')).toBe(true);
  });
});
