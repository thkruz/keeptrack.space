/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// Standard ISS TLE — inclination 51.6415, RAAN 161.8339.
const tle1 = '1 25544U 98067A   22203.46960946  .00003068  00000+0  61583-4 0  9996' as TleLine1;
const tle2 = '2 25544  51.6415 161.8339 0005168  35.9781  54.7009 15.50067047350657' as TleLine2;

describe('NewLaunch launch-window matching', () => {
  let plugin: NewLaunch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  let issSat: Satellite;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new NewLaunch();
    websiteInit(plugin);

    issSat = new Satellite({ tle1, tle2 });
    (getEl('nl-scc') as HTMLInputElement).value = '25544';

    // resolveLaunchSiteLatLon_ reads the catalog manager's launchSites map; the
    // select needs a matching option for .value assignment to stick.
    (getEl('nl-facility') as HTMLSelectElement).insertAdjacentHTML('beforeend', '<option value="KSC">KSC</option>');
    (getEl('nl-facility') as HTMLSelectElement).value = 'KSC';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getCatalogManager() as any).launchSites = { KSC: { lat: 28.608 as Degrees, lon: 279.396 as Degrees } };

    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(issSat as never);

    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date('2022-07-22T00:00:00Z');
  });

  afterEach(() => vi.restoreAllMocks());

  it('finds a launch window within 24 hours and shows the result note', () => {
    p().onMatchTargetPlane_();

    expect(p().matchedLaunchTime_).toBeInstanceOf(Date);
    const deltaMs = p().matchedLaunchTime_.getTime() - new Date('2022-07-22T00:00:00Z').getTime();

    expect(deltaMs).toBeGreaterThanOrEqual(0);
    expect(deltaMs).toBeLessThanOrEqual(24 * 3600 * 1000);

    const note = getEl('nl-window-result')!;

    expect(note.style.display).toBe('flex');
    expect(note.textContent).toContain('ΔRAAN');
  });

  it('renders an imported target name as text, not markup', () => {
    issSat.name = '<img src=x onerror="alert(1)">';

    p().onMatchTargetPlane_();

    const note = getEl('nl-window-result')!;

    expect(note.querySelector('img')).toBeNull();
    expect(note.textContent).toContain('<img src=x onerror="alert(1)">');
  });

  it('shows target and site names with special characters exactly as written', () => {
    issSat.name = 'ISS & "ZARYA"';
    (getEl('nl-facility') as HTMLSelectElement).selectedOptions[0].textContent = 'Cape A & B';

    p().onMatchTargetPlane_();

    const text = getEl('nl-window-result')!.textContent ?? '';

    expect(text).toContain('ISS & "ZARYA" (25544)');
    expect(text).toContain('Cape A & B');
    expect(text).not.toContain('&amp;');
  });

  it('arms the window without launching and can be cleared via the result note', () => {
    p().onMatchTargetPlane_();
    expect(p().matchedLaunchTime_).not.toBeNull();

    // Finding a window only arms it; the clear affordance in the note disarms it.
    const clearBtn = getEl('nl-window-clear', true);

    expect(clearBtn).not.toBeNull();
    clearBtn!.dispatchEvent(new Event('click'));

    expect(p().matchedLaunchTime_).toBeNull();
    expect(getEl('nl-window-result')!.style.display).toBe('none');
  });

  it('toasts when no target satellite resolves', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(null as never);
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().onMatchTargetPlane_();

    expect(toast).toHaveBeenCalled();
    expect(p().matchedLaunchTime_).toBeNull();
  });

  it('toasts and stays unmatched when the inclination is below the site latitude', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getCatalogManager() as any).launchSites = { KSC: { lat: 60 as Degrees, lon: 0 as Degrees } };
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().onMatchTargetPlane_();

    expect(toast).toHaveBeenCalled();
    expect(p().matchedLaunchTime_).toBeNull();
  });

  it('clears the matched window when the facility or direction changes', () => {
    p().onMatchTargetPlane_();
    expect(p().matchedLaunchTime_).not.toBeNull();

    getEl('nl-facility')!.dispatchEvent(new Event('change'));

    expect(p().matchedLaunchTime_).toBeNull();
    expect(getEl('nl-window-result')!.style.display).toBe('none');

    p().onMatchTargetPlane_();
    expect(p().matchedLaunchTime_).not.toBeNull();

    getEl('nl-updown')!.dispatchEvent(new Event('change'));

    expect(p().matchedLaunchTime_).toBeNull();
  });

  it('launches at the matched time instead of 0000z', () => {
    const matched = new Date(Date.now() + 5 * 3600 * 1000);

    p().matchedLaunchTime_ = matched;

    // Short-circuit the launch after the time change: an orbit-fit error path
    // reverts the offset, so only the time jump (changeSimulationTime) matters.
    vi.spyOn(p(), 'buildLaunchTle_').mockReturnValue(['Error', 'stop']);
    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getColorSchemeManager() as any).calculateColorBuffers = vi.fn();
    vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined as never);
    const jumpSpy = vi.spyOn(ServiceLocator.getTimeManager(), 'changeSimulationTime').mockImplementation(() => undefined as never);

    p().launchFromSite_(issSat, 5);

    // Jumps to the matched time itself, not to 0000z.
    expect(jumpSpy).toHaveBeenCalledWith(matched.getTime());
  });
});
