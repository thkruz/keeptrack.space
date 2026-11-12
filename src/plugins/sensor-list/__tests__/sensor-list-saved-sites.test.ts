/* eslint-disable dot-notation */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { makeSiteSource, mockPersistence } from '@app/plugins/sensor/__tests__/saved-site-test-utils';
import { getSavedSites, removeSavedSite, saveSites } from '@app/plugins/sensor/custom-site-registry';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const LANGS = ['cs', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'uk', 'zh'];
const NEW_KEYS: [string, string][] = [
  ['labels', 'savedSites'],
  ['labels', 'savedSite_current'],
  ['labels', 'savedSite_active'],
  ['labels', 'savedSite_saved'],
  ['buttons', 'removeSavedSite'],
  ['commands', 'setSavedSite'],
  ['commands', 'activateSavedSite'],
  ['buttons', 'activateSavedSite'],
  ['buttons', 'deactivateSavedSite'],
];

describe('SensorListPlugin saved custom sites', () => {
  it.each(LANGS)('locale %s has every saved-site string, with the {name} placeholder where needed', (lang) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const json = JSON.parse(readFileSync(resolve(__dirname, `../locales/${lang}.src.json`), 'utf8')).plugins.SensorListPlugin;

    for (const [group, key] of NEW_KEYS) {
      expect(json[group][key], `${lang}.${group}.${key}`).toBeTruthy();
    }
    expect(json.buttons.removeSavedSite).toContain('{name}');
    expect(json.commands.setSavedSite).toContain('{name}');
  });

  let plugin: SensorListPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sm: any;
  let section: HTMLElement;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (DateTimeManager.prototype as any).uiManagerFinal_ = vi.fn();
    setupStandardEnvironment([TopMenu, DateTimeManager]);
    mockPersistence();
    plugin = new SensorListPlugin();
    sm = ServiceLocator.getSensorManager();
    sm.currentSensors = [];
    sm.secondarySensors = [];
    document.body.innerHTML = '<section id="saved-sites-section" style="display:none"></section>';
    section = document.getElementById('saved-sites-section') as HTMLElement;
    ServiceLocator.getMainCamera().lookAtLatLon = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('the menu markup carries the saved-sites container', () => {
    expect(plugin.sideMenuElementHtml).toContain('id="saved-sites-section"');
  });

  it('stays hidden with no saved sites', () => {
    p().renderSavedSites_();

    expect(section.style.display).toBe('none');
    expect(section.children).toHaveLength(0);
  });

  it('lists every saved site, including two with the same name, with their state', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'Same', 40), makeSiteSource('Custom Sensor-bbb', 'Same', 41)]);
    p().renderSavedSites_();

    const rows = section.querySelectorAll<HTMLElement>('[data-saved-site]');

    expect([...rows].map((r) => r.dataset.savedSite)).toEqual(['Custom Sensor-aaa', 'Custom Sensor-bbb']);
    expect(rows[0].querySelector('.sensor-name')?.textContent).toBe('Same');
    expect(rows[0].querySelector('.sensor-system')?.textContent).toBe('40.000°N, 20.000°E');
    expect((rows[0].querySelector('.sensor-badge') as HTMLElement).dataset.state).toBe('saved');
    expect(section.style.display).toBe('');
  });

  it('renders a hostile name as text, never markup', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', '<img src=x onerror=alert(1)>')]);
    p().renderSavedSites_();

    expect(section.querySelector('img')).toBeNull();
    expect(section.querySelector('.sensor-name')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('useSavedSite_ makes the site current and flips its badge to Current', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41)]);

    expect(SensorListPlugin['useSavedSite_']('Custom Sensor-bbb')).toBe(true);
    p().renderSavedSites_();

    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-bbb');
    expect((section.querySelector('[data-saved-site="Custom Sensor-bbb"] .sensor-badge') as HTMLElement).dataset.state).toBe('current');
    expect((section.querySelector('[data-saved-site="Custom Sensor-aaa"] .sensor-badge') as HTMLElement).dataset.state).toBe('saved');
    expect(ServiceLocator.getMainCamera().lookAtLatLon).toHaveBeenCalled();
    expect(SensorListPlugin['useSavedSite_']('nope')).toBe(false);
  });

  it('the remove control carries the site id and name, and removing deletes only the registry entry', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE'), makeSiteSource('Custom Sensor-bbb', 'COAST')]);
    p().renderSavedSites_();

    const remove = section.querySelector<HTMLElement>('[data-remove-saved-site="Custom Sensor-aaa"]');

    expect(remove?.getAttribute('aria-label')).toBeTruthy();
    expect(remove?.title).toBe(remove?.getAttribute('aria-label'));
    removeSavedSite(remove?.dataset.removeSavedSite as string);
    p().renderSavedSites_();

    expect(getSavedSites().map((s) => s.id)).toEqual(['Custom Sensor-bbb']);
    expect(section.querySelectorAll('[data-saved-site]')).toHaveLength(1);
  });

  it('adds one palette command per saved site that makes it current', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41)]);

    const commands = plugin.getCommandPaletteCommands().filter((c) => c.id.startsWith('SensorListPlugin.setSavedSite.'));

    expect(commands.map((c) => c.id)).toEqual(['SensorListPlugin.setSavedSite.Custom Sensor-aaa', 'SensorListPlugin.setSavedSite.Custom Sensor-bbb']);
    expect(commands[1].keywords).toContain('COAST');
    expect(commands[1].description).toBe('41.000°N, 20.000°E');
    expect(commands[1].category).toBe('Sensors');

    commands[1].callback();
    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-bbb');
  });

  it('the menu click handler routes a saved row to make-current and the x control to remove', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41)]);
    document.body.innerHTML = '<div id="sensor-list-content"><section id="saved-sites-section"></section></div>';

    p().renderSavedSites_();
    const row = document.querySelector<HTMLElement>('[data-saved-site="Custom Sensor-bbb"]');

    p().onMenuClick_({ target: row });
    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-bbb');

    p().onMenuClick_({ target: document.querySelector('[data-remove-saved-site="Custom Sensor-aaa"]') });
    expect(getSavedSites().map((x) => x.id)).toEqual(['Custom Sensor-bbb']);
    p().renderSavedSites_();
    expect(document.querySelectorAll('[data-saved-site]')).toHaveLength(1);
  });

  it('the toggle control adds a saved site to the active sensors and a second click removes it', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE', 40), makeSiteSource('Custom Sensor-bbb', 'COAST', 41)]);
    document.body.innerHTML = '<div id="sensor-list-content"><section id="saved-sites-section"></section></div>';
    SensorListPlugin['useSavedSite_']('Custom Sensor-aaa');
    p().renderSavedSites_();

    p().onMenuClick_({ target: document.querySelector('[data-toggle-saved-site="Custom Sensor-bbb"]') });
    expect(sm.currentSensors[0].objName).toBe('Custom Sensor-aaa');
    expect(sm.secondarySensors.map((x: { objName: string }) => x.objName)).toEqual(['Custom Sensor-bbb']);
    expect((document.querySelector('[data-saved-site="Custom Sensor-bbb"] .sensor-badge') as HTMLElement).dataset.state).toBe('active');

    p().onMenuClick_({ target: document.querySelector('[data-toggle-saved-site="Custom Sensor-bbb"]') });
    expect(sm.secondarySensors).toHaveLength(0);
    expect(getSavedSites()).toHaveLength(2);
  });

  it('hides the palette command once its site is removed', () => {
    saveSites([makeSiteSource('Custom Sensor-aaa', 'RIDGE')]);
    const command = plugin.getCommandPaletteCommands().find((c) => c.id.startsWith('SensorListPlugin.setSavedSite.'))!;

    removeSavedSite('Custom Sensor-aaa');

    expect(command.isAvailable?.()).toBe(false);
  });
});
