/* biome-ignore-all lint/complexity/useLiteralKeys: Tests drive the private hover renderer directly. */
import { HoverManager } from '@app/app/ui/hover-manager';
import { getEl } from '@app/engine/utils/get-el';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('HoverManager escapes satellite names', () => {
  let hoverManager: HoverManager;
  const payload = '<img src=x onerror="window.__ktXss=1">';

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.enableHoverOverlay = true;
    settingsManager.disableUI = false;
    settingsManager.isEPFL = false;
    settingsManager.isEciOnHover = false;
    settingsManager.isShowNextPass = false;
    hoverManager = new HoverManager();
    hoverManager.init();
  });

  it('renders an external catalog name as text, not markup', () => {
    const sat = new Satellite({ ...defaultSat, id: 0, name: `EVIL ${payload}` });

    hoverManager['satObj_'](sat);
    const node1 = getEl('sat-hoverbox1')!;

    expect(node1.querySelector('img')).toBeNull();
    expect(node1.textContent).toContain(`EVIL ${payload}`);
    // The flag span the hover box builds is still there.
    expect(node1.querySelector('#hoverbox-fi')).not.toBeNull();
  });
});
