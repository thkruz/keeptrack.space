/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ANALYSIS_COLUMNS,
  clampReentriesMenuWidth,
  isReentriesMenuCompact,
  REENTRIES_MAX_WIDTH,
  REENTRIES_MIN_DRAG_WIDTH,
  REENTRIES_PREFERRED_WIDTH,
  REENTRIES_SHOW_ALL_COLUMNS_KEY,
  Reentries,
  TIP_COLUMNS,
  TipMsg,
} from '@app/plugins/reentries/reentries';
import { settingsManager } from '@app/settings/settings';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const tip: TipMsg = {
  NORAD_CAT_ID: '25544',
  MSG_EPOCH: '2024-12-01 10:00:00',
  INSERT_EPOCH: '2024-12-01 09:00:00',
  DECAY_EPOCH: '2024-12-15 12:00:00',
  WINDOW: '120',
  REV: '100',
  DIRECTION: 'N',
  LAT: '45.5',
  LON: '120.5',
  INCL: '51.6',
  NEXT_REPORT: '24',
  ID: '1',
  HIGH_INTEREST: 'Y',
  OBJECT_NUMBER: '1',
};

const setViewportWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
};

const lowKeys = (columns: typeof TIP_COLUMNS): string[] => columns.filter((c) => c.isLowPriority).map((c) => c.key);

describe('clampReentriesMenuWidth', () => {
  it('opens at the preferred 1200 px when the viewport has room', () => {
    expect(clampReentriesMenuWidth(REENTRIES_PREFERRED_WIDTH, 1920, 60)).toBe(1200);
  });

  it('caps the width at the space right of the drawer rail minus the margin', () => {
    // 150% zoom on a 1366 px screen with the 90 px rail (the re-06 evidence shot).
    expect(clampReentriesMenuWidth(REENTRIES_PREFERRED_WIDTH, 911, 90)).toBe(911 - 90 - 16);
    expect(clampReentriesMenuWidth(REENTRIES_PREFERRED_WIDTH, 1100, 0)).toBe(1100 - 16);
  });

  it('keeps a dragged preference inside the drag limits', () => {
    expect(clampReentriesMenuWidth(2000, 2560, 0)).toBe(REENTRIES_MAX_WIDTH);
    expect(clampReentriesMenuWidth(100, 1920, 0)).toBe(REENTRIES_MIN_DRAG_WIDTH);
  });

  it('lets the available space win over the drag minimum on a tiny viewport', () => {
    expect(clampReentriesMenuWidth(REENTRIES_PREFERRED_WIDTH, 400, 60)).toBe(324);
    expect(clampReentriesMenuWidth(REENTRIES_PREFERRED_WIDTH, 50, 60)).toBe(0);
  });
});

describe('isReentriesMenuCompact', () => {
  it('folds below 1000 px of menu width and ignores an unmeasured (hidden) menu', () => {
    expect(isReentriesMenuCompact(999)).toBe(true);
    expect(isReentriesMenuCompact(1000)).toBe(false);
    expect(isReentriesMenuCompact(0)).toBe(false);
  });
});

describe('column priority', () => {
  it('folds the report cadence and catalog-derived TIP columns, keeping identity, decay, window, location and angle', () => {
    expect(lowKeys(TIP_COLUMNS)).toEqual(['nextReport', 'rcs', 'gpAge', 'dryMass', 'volume']);
    expect(TIP_COLUMNS.filter((c) => c.isPinned).map((c) => c.key)).toEqual(['norad']);
  });

  it('folds inclination and RCS on Reentry Analysis and pins NORAD + Name', () => {
    expect(lowKeys(ANALYSIS_COLUMNS)).toEqual(['incl', 'rcsSup']);
    expect(ANALYSIS_COLUMNS.filter((c) => c.isPinned).map((c) => c.key)).toEqual(['norad', 'name']);
  });
});

describe('Reentries narrow-screen layout', () => {
  let plugin: Reentries;
  const p = () => plugin as any;
  const menu = () => document.getElementById('reentries-menu') as HTMLElement;

  beforeEach(() => {
    setupStandardEnvironment();
    sessionStorage.clear();
    settingsManager.isMobileModeEnabled = false;
    document.documentElement.style.setProperty('--drawer-offset', '60px');
    setViewportWidth(1920);
    plugin = new Reentries();
    websiteInit(plugin);
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--drawer-offset');
    vi.restoreAllMocks();
  });

  it('wraps each results table in a horizontal scroll container with a Columns switch', () => {
    for (const id of ['reentries-tip-table', 'reentries-analysis-table']) {
      const table = document.getElementById(id)!;

      expect(table.parentElement?.classList.contains('re-table-scroll')).toBe(true);
      expect(table.closest('.kt-section')?.querySelector('.re-cols-switch .re-show-all-cols-input')).not.toBeNull();
    }
  });

  it('opens at the preferred width on a wide viewport without folding', () => {
    p().fitMenuToViewport_();

    expect(menu().style.width).toBe('1200px');
    expect(menu().classList.contains('re-cols-narrow')).toBe(false);
    expect(menu().classList.contains('re-cols-folded')).toBe(false);
  });

  it('fits a narrow viewport and folds low-priority columns', () => {
    setViewportWidth(911);
    p().fitMenuToViewport_();

    expect(menu().style.width).toBe(`${911 - 60 - 16}px`);
    expect(menu().classList.contains('re-cols-narrow')).toBe(true);
    expect(menu().classList.contains('re-cols-folded')).toBe(true);
  });

  it('re-evaluates the width on window resize', () => {
    setViewportWidth(911);
    window.dispatchEvent(new Event('resize'));
    expect(menu().style.width).toBe('835px');

    setViewportWidth(1920);
    window.dispatchEvent(new Event('resize'));
    expect(menu().style.width).toBe('1200px');
    expect(menu().classList.contains('re-cols-folded')).toBe(false);
  });

  it('keeps a width the user dragged to as the new preference', () => {
    p().fitMenuToViewport_();
    // The drag handle writes the inline width directly.
    menu().style.width = '1400px';
    setViewportWidth(1000);
    p().fitMenuToViewport_();
    expect(menu().style.width).toBe(`${1000 - 60 - 16}px`);

    setViewportWidth(1920);
    p().fitMenuToViewport_();
    expect(menu().style.width).toBe('1400px');
  });

  it('leaves the width alone in mobile mode (side menus are full-screen there)', () => {
    menu().style.width = '';
    settingsManager.isMobileModeEnabled = true;
    p().fitMenuToViewport_();

    expect(menu().style.width).toBe('');
  });

  it('tags TIP cells with pin and fold classes in header and data rows', () => {
    p().tipList_ = [tip];
    p().createTipTable_();

    const table = document.getElementById('reentries-tip-table') as HTMLTableElement;

    for (const row of [table.rows[0], table.rows[1]]) {
      expect(row.cells[0].classList.contains('re-col-pin')).toBe(true);
      expect(row.cells[0].classList.contains('re-col-pin-last')).toBe(true);
      expect(
        Array.from(row.cells)
          .filter((c) => c.classList.contains('re-col-low'))
          .map((c) => c.dataset.col)
      ).toEqual(['nextReport', 'rcs', 'gpAge', 'dryMass', 'volume']);
    }
  });

  it('pins NORAD and Name on Reentry Analysis rows and marks Name as the last pin', () => {
    const table = document.getElementById('reentries-analysis-table') as HTMLTableElement;
    const sat = { id: 3, sccNum: '99999', name: 'TEST SAT', type: SpaceObjectType.DEBRIS, perigee: 300, apogee: 400, inclination: 51.6, rcs: 1.5, toClassicalElements: () => ({}) };

    Reentries['createReentryHeaders_'](table);
    Reentries['createReentryRow_'](table, sat as any);

    for (const row of [table.rows[0], table.rows[1]]) {
      expect(row.cells[0].classList.contains('re-col-pin-norad')).toBe(true);
      expect(row.cells[1].classList.contains('re-col-pin-name')).toBe(true);
      expect(row.cells[1].classList.contains('re-col-pin-last')).toBe(true);
      expect(row.cells[6].classList.contains('re-col-low')).toBe(true);
      expect(row.cells[7].classList.contains('re-col-low')).toBe(true);
    }
  });

  it('the Columns switch shows every column, syncs both switches and is remembered for the session', () => {
    setViewportWidth(911);
    p().fitMenuToViewport_();
    expect(menu().classList.contains('re-cols-folded')).toBe(true);

    const [tipSwitch, analysisSwitch] = Array.from(document.querySelectorAll<HTMLInputElement>('.re-show-all-cols-input'));

    tipSwitch.checked = true;
    tipSwitch.dispatchEvent(new Event('change'));

    expect(menu().classList.contains('re-cols-folded')).toBe(false);
    // Still narrow, so the switch stays visible to turn folding back on.
    expect(menu().classList.contains('re-cols-narrow')).toBe(true);
    expect(analysisSwitch.checked).toBe(true);
    expect(sessionStorage.getItem(REENTRIES_SHOW_ALL_COLUMNS_KEY)).toBe('true');

    analysisSwitch.checked = false;
    analysisSwitch.dispatchEvent(new Event('change'));

    expect(menu().classList.contains('re-cols-folded')).toBe(true);
    expect(tipSwitch.checked).toBe(false);
    expect(sessionStorage.getItem(REENTRIES_SHOW_ALL_COLUMNS_KEY)).toBe('false');
  });

  it('restores a "show all" choice made earlier in the session', () => {
    sessionStorage.setItem(REENTRIES_SHOW_ALL_COLUMNS_KEY, 'true');
    const restored = new Reentries();

    expect((restored as any).isShowAllColumns_).toBe(true);
  });

  it('keeps the fold state while the menu is hidden (measures 0 px)', () => {
    setViewportWidth(911);
    p().fitMenuToViewport_();
    p().updateColumnFold_(0);

    expect(menu().classList.contains('re-cols-folded')).toBe(true);
  });
});
