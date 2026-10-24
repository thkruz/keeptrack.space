import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import type { DsResultRow } from '@app/webworker/debris-screening-messages';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const RIC_CONVENTION =
  "RIC sign convention: secondary minus primary, in the primary's RIC frame (+R radially outward, +I along the primary's velocity, +C = R x I, the orbit normal).";

describe('DebrisScreening results table', () => {
  let plugin: DebrisScreening;
  // intlDes comes from the TLE parse, so it is set after construction.
  const named = Object.assign(new Satellite({ ...defaultSat, id: 0, sccNum: '38479', name: 'COSMOS 2251 DEB' }), { intlDes: '1993-036PX' });
  // JSC Vimpel objects are created with an empty sccNum and an altId (catalog-loader).
  const vimpel = new Satellite({ ...defaultSat, id: 1, sccNum: '', altId: '90061', name: 'JSC Vimpel 90061' });
  const parent = new Satellite({ ...defaultSat, id: 2, sccNum: '39084', name: 'LANDSAT 8' });
  const objects: Satellite[] = [named, vimpel, parent];

  const row = (secondaryId: string, pc: number): DsResultRow => ({
    secondaryId,
    tcaMs: Date.UTC(2026, 9, 16, 5, 38, 39),
    missDistance: 7.593,
    radialDistance: 6.267,
    intrackDistance: -4.129,
    crosstrackDistance: -1.151,
    relativeVelocity: 4.271,
    probabilityOfCollision: pc,
    riskScore: 0.5,
  });

  type Internals = {
    rows_: DsResultRow[];
    renderRows_: (rows: DsResultRow[], countText?: string) => void;
    registerSecondary_: (sat: Satellite) => string;
    beginScreeningRun_: (primary: Satellite) => void;
    isParentRowShown_: boolean;
  };
  const internals = () => plugin as unknown as Internals;
  const bodyRows = () => Array.from(getEl('ds-results-body')!.querySelectorAll('tr'));
  const clickFirstRow = () =>
    bodyRows()[0]
      .querySelector('td')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const cells = (tr: Element) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent ?? '');
  const analystWith = (field: 'derivedFromSccNum' | 'parentSccNum' | 'derivedFrom', value: string): Satellite => {
    const analyst = new Satellite({ ...defaultSat, id: 5, sccNum: '90000', name: 'ANALYST' });

    (analyst as unknown as Record<string, string>)[field] = value;

    return analyst;
  };

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    const catalogManager = ServiceLocator.getCatalogManager();

    catalogManager.objectCache = objects as never;
    vi.spyOn(catalogManager, 'getObject').mockImplementation(((id: number) => objects[id] ?? null) as never);
    vi.spyOn(catalogManager, 'sccNum2Id').mockImplementation(((scc: string) => objects.find((o) => o.sccNum === scc && scc !== '')?.id ?? null) as never);
    plugin = new DebrisScreening();
    websiteInit(plugin);
    ServiceLocator.getTimeManager().changeStaticOffset = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds Secondary Name and Rel. Velocity columns to the table header', () => {
    const headers = Array.from(getEl('ds-results-table')!.querySelectorAll('th')).map((th) => th.textContent?.trim());

    expect(headers).toEqual(['Secondary', 'Secondary Name', 'COSPAR ID', 'TCA', 'Miss (km)', 'R (km)', 'I (km)', 'C (km)', 'Rel. Velocity (km/s)', 'Pc', 'Risk']);
  });

  it('renders the catalog name, COSPAR ID and relative velocity for each row', () => {
    internals().beginScreeningRun_(defaultSat);
    internals().registerSecondary_(named);
    internals().renderRows_([row('38479', 1e-6)]);

    const values = cells(bodyRows()[0]);

    expect(values[0]).toBe('38479');
    expect(values[1]).toBe('COSMOS 2251 DEB');
    expect(values[2]).toBe('1993-036PX');
    expect(values[8]).toBe('4.271');
  });

  it('renders signed R/I/C (secondary minus primary, primary RIC frame), not magnitudes', () => {
    internals().beginScreeningRun_(defaultSat);
    internals().registerSecondary_(named);
    internals().renderRows_([row('38479', 1e-6)]);

    const values = cells(bodyRows()[0]);

    expect(values.slice(5, 8)).toEqual(['6.267', '-4.129', '-1.151']);
  });

  it('leaves the COSPAR cell blank when the catalog has no designator', () => {
    const noDes = Object.assign(new Satellite({ ...defaultSat, id: 0, sccNum: '38479', name: 'COSMOS 2251 DEB' }), { intlDes: 'none' });

    objects[0] = noDes;
    try {
      internals().beginScreeningRun_(defaultSat);
      internals().registerSecondary_(noDes);
      internals().renderRows_([row('38479', 1e-6)]);

      expect(cells(bodyRows()[0])[2]).toBe('');
    } finally {
      objects[0] = named;
    }
  });

  it('gives an object without a NORAD number a display id plus its name instead of a blank', () => {
    internals().beginScreeningRun_(defaultSat);
    const key = internals().registerSecondary_(vimpel);

    expect(key).toBe('JSC 90061');
    internals().renderRows_([row(key, 1e-6)]);

    const values = cells(bodyRows()[0]);

    expect(values[0]).toBe('JSC 90061');
    expect(values[1]).toBe('JSC Vimpel 90061');
  });

  it('falls back to the catalog id when an object has neither a NORAD number nor an altId', () => {
    const bare = new Satellite({ ...defaultSat, id: 1, sccNum: '00000', name: 'NOTIONAL' });

    expect(DebrisScreening.screeningKey(bare)).toBe('#1');
  });

  it('selects a no-NORAD secondary by its catalog id on row click', () => {
    const setSecondary = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'setSecondarySat').mockImplementation(() => undefined);

    internals().beginScreeningRun_(defaultSat);
    internals().renderRows_([row(internals().registerSecondary_(vimpel), 1e-6)]);

    clickFirstRow();

    expect(setSecondary).toHaveBeenCalledWith(1);
    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
  });

  it('says why a row cannot be selected instead of failing silently', () => {
    const setSecondary = vi.spyOn(PluginRegistry.getPlugin(SelectSatManager)!, 'setSecondarySat').mockImplementation(() => undefined);
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    internals().beginScreeningRun_(defaultSat);
    // Never registered and not a NORAD number: unresolvable.
    internals().renderRows_([row('JSC 11111', 1e-6)]);

    expect(cells(bodyRows()[0])[1]).toBe('(not in loaded catalog)');
    clickFirstRow();

    expect(setSecondary).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Cannot select JSC 11111'));
    // The clock still jumps to TCA.
    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
  });

  it('tags and hides the parent row of an analyst satellite behind a visible toggle', () => {
    // derivedFromSccNum is what the maneuver plugin writes on a new analyst satellite.
    internals().beginScreeningRun_(analystWith('derivedFromSccNum', '39084'));
    internals().registerSecondary_(parent);
    internals().registerSecondary_(named);
    internals().renderRows_([row('39084', 4.88e-4), row('38479', 1e-6)]);

    // Hidden by default; the count reflects what is shown.
    expect(bodyRows()).toHaveLength(1);
    expect(cells(bodyRows()[0])[0]).toBe('38479');
    expect(getEl('ds-results-count')!.textContent).toBe('1 conjunctions found');
    expect(getEl('ds-parent-toggle')!.style.display).toBe('');
    expect(getEl('ds-show-parent-label')!.textContent).toBe('Show parent row (1)');

    const checkbox = getEl('ds-show-parent') as HTMLInputElement;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(bodyRows()).toHaveLength(2);
    const parentRow = bodyRows().find((tr) => cells(tr)[0] === '39084')!;

    expect(parentRow.classList.contains('ds-parent-row')).toBe(true);
    expect(parentRow.querySelector('.ds-parent-tag')!.textContent).toBe('parent of this analyst satellite');
  });

  it('hides the parent row again for the next screening run', () => {
    internals().beginScreeningRun_(analystWith('parentSccNum', '39084'));
    internals().registerSecondary_(parent);
    internals().renderRows_([row('39084', 4.88e-4)]);
    const checkbox = getEl('ds-show-parent') as HTMLInputElement;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(bodyRows()).toHaveLength(1);

    internals().beginScreeningRun_(analystWith('parentSccNum', '39084'));
    internals().registerSecondary_(parent);
    internals().renderRows_([row('39084', 4.88e-4)]);

    expect(checkbox.checked).toBe(false);
    expect(bodyRows()).toHaveLength(0);
  });

  it('keeps the parent toggle hidden when the primary has no lineage', () => {
    internals().beginScreeningRun_(defaultSat);
    internals().registerSecondary_(parent);
    internals().renderRows_([row('39084', 4.88e-4)]);

    expect(bodyRows()).toHaveLength(1);
    expect(getEl('ds-parent-toggle')!.style.display).toBe('none');
  });

  it('exports the name, COSPAR ID, signed RIC, relative velocity and parent note to CSV', async () => {
    let exported: Blob | null = null;

    internals().beginScreeningRun_(analystWith('derivedFrom', '39084'));
    internals().registerSecondary_(parent);
    internals().registerSecondary_(named);
    internals().rows_ = [row('39084', 4.88e-4), row('38479', 1e-6)];
    // The CSV follows the table: the parent row is exported only while it is shown.
    internals().isParentRowShown_ = true;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;

      return 'blob:test';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    plugin.onDownload();
    const csv = await (exported as unknown as Blob).text();

    const [header, first, second] = csv.split('\n');

    expect(header).toBe('Secondary,Secondary Name,Secondary COSPAR,TCA (UTC),Miss Distance (km),Radial (km),Intrack (km),Crosstrack (km),Rel Velocity (km/s),Pc,Risk Level,Note');
    expect(first.startsWith(`39084,LANDSAT 8,${parent.intlDes},`)).toBe(true);
    expect(first.endsWith(',parent of this analyst satellite')).toBe(true);
    expect(first).toContain(',4.271000,');
    expect(second.startsWith('38479,COSMOS 2251 DEB,1993-036PX,')).toBe(true);
    expect(second).toContain(',6.267000,-4.129000,-1.151000,');

    internals().isParentRowShown_ = false;
    plugin.onDownload();
    const hiddenCsv = await (exported as unknown as Blob).text();

    const hiddenLines = hiddenCsv.split('\n');

    expect(hiddenLines).toHaveLength(2);
    expect(hiddenLines[1].startsWith('38479,')).toBe(true);
  });

  it('states the RIC sign convention and the Pc inputs in the results header and help', () => {
    expect(getEl('ds-ric-convention')!.textContent).toContain(RIC_CONVENTION);

    const pcText = getEl('ds-pc-inputs')!.textContent!;
    const hbrM = (DebrisScreening.PRIMARY_HARD_BODY_RADIUS_KM + DebrisScreening.SECONDARY_HARD_BODY_RADIUS_KM) * 1000;

    // Built from the same constants the screening paths use.
    expect(pcText).toContain(`hard-body radius ${hbrM} m`);
    expect(pcText).toContain(`${settingsManager.covarianceConfidenceLevel} sigma`);
    expect(pcText).toContain('not from a CDM');

    expect(plugin.getHelpConfig().tips).toContain(RIC_CONVENTION);
  });
});
