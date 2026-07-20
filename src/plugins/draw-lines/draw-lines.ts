import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { MenuMode, SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ReferenceFrame } from '@app/engine/math/reference-frames';
import { IContextMenuConfig, IKeyboardShortcut, RmbMenuContext } from '@app/engine/plugins/core/plugin-capabilities';
import { lineManagerInstance } from '@app/engine/rendering/line-manager';
import { LineColors } from '@app/engine/rendering/line-manager/line';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { Kilometers, Satellite } from '@ootk/src/main';
import drawLinesPng from '@public/img/icons/background-grid-small.png';
import { vec4 } from 'gl-matrix';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './draw-lines.css';

type ClickableObject = Satellite | MissileObject | OemSatellite;

/** Resolved inputs shared by every draw action, built fresh per invocation. */
interface DrawActionContext {
  clickSatObj: ClickableObject | null;
  primarySatObj: ClickableObject | null;
  sensor: DetailedSensor | null;
  referenceFrame: ReferenceFrame;
}

/** Visibility gates for a draw action. An unmet requirement hides the action. */
type DrawRequirement = 'earth' | 'clickedSat' | 'primarySat' | 'sensor';

interface DrawAction {
  /** Base DOM id. The RMB item is `${id}-rmb`, the side-menu button is `${id}-btn`. */
  id: string;
  /** Key under `plugins.DrawLinesPlugin.rmbMenu.*`. */
  labelKey: string;
  /** Side-menu card this action belongs to. */
  section: 'axes' | 'object';
  /** Whether this action is offered in the side menu (some are right-click only). */
  inSideMenu: boolean;
  requires: DrawRequirement[];
  run: (ctx: DrawActionContext) => void;
}

/** Clone a shared color constant so callees that mutate alpha don't poison {@link LineColors}. */
const rgba = (color: vec4, alpha = color[3]): vec4 => [color[0], color[1], color[2], alpha];

const tDraw = (key: string): string => t7e(`plugins.DrawLinesPlugin.${key}` as Parameters<typeof t7e>[0]);

export class DrawLinesPlugin extends KeepTrackPlugin {
  readonly id = 'DrawLinesPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

  bottomIconImg = drawLinesPng;

  private t_(key: string): string {
    return tDraw(key);
  }

  /**
   * Single source of truth for every line a user can draw. The right-click menu, the
   * side menu, the dispatch logic, and the visibility logic all derive from this table,
   * so they can never drift out of sync.
   */
  static readonly DRAW_ACTIONS: DrawAction[] = [
    {
      id: 'line-eci-axis',
      labelKey: 'eciAxes',
      section: 'axes',
      inSideMenu: true,
      requires: ['earth'],
      run: (ctx) => {
        lineManagerInstance.createRef2Ref([0, 0, 0], [25000, 0, 0], rgba(LineColors.RED), ctx.referenceFrame);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 25000, 0], rgba(LineColors.GREEN), ctx.referenceFrame);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 0, 25000], rgba(LineColors.BLUE), ctx.referenceFrame);
      },
    },
    {
      id: 'line-eci-xgrid',
      labelKey: 'xAxesGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) => lineManagerInstance.createGrid('x', [0.6, 0.2, 0.2, 0.3], 1, ctx.referenceFrame),
    },
    {
      id: 'line-eci-ygrid',
      labelKey: 'yAxesGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) => lineManagerInstance.createGrid('y', [0.2, 0.6, 0.2, 0.3], 1, ctx.referenceFrame),
    },
    {
      id: 'line-eci-zgrid',
      labelKey: 'zAxesGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) => lineManagerInstance.createGrid('z', [0.2, 0.2, 0.6, 0.3], 1, ctx.referenceFrame),
    },
    {
      id: 'line-eci-radial-xgrid',
      labelKey: 'xAxesRadialGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) =>
        lineManagerInstance.createGridRadial({
          axis: 'x',
          color: rgba(LineColors.RED),
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ctx.referenceFrame,
        }),
    },
    {
      id: 'line-eci-radial-ygrid',
      labelKey: 'yAxesRadialGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) =>
        lineManagerInstance.createGridRadial({
          axis: 'y',
          color: rgba(LineColors.GREEN),
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ctx.referenceFrame,
        }),
    },
    {
      id: 'line-eci-radial-zgrid',
      labelKey: 'zAxesRadialGrid',
      section: 'axes',
      inSideMenu: true,
      requires: [],
      run: (ctx) =>
        lineManagerInstance.createGridRadial({
          axis: 'z',
          color: rgba(LineColors.BLUE),
          opacity: 0.3,
          circleInterval: 50000 as Kilometers,
          referenceFrame: ctx.referenceFrame,
        }),
    },
    {
      id: 'line-earth-sat',
      labelKey: 'earthToSatellite',
      section: 'object',
      inSideMenu: true,
      requires: ['clickedSat'],
      run: (ctx) => lineManagerInstance.createSatToRef(ctx.clickSatObj, [0, 0, 0], rgba(LineColors.PURPLE)),
    },
    {
      id: 'line-sensor-sat',
      labelKey: 'sensorToSatellite',
      section: 'object',
      inSideMenu: true,
      requires: ['clickedSat', 'sensor'],
      run: (ctx) => lineManagerInstance.createSensorToSat(ctx.sensor, ctx.clickSatObj, rgba(LineColors.GREEN)),
    },
    {
      id: 'line-sat-ric',
      labelKey: 'satelliteRicAxes',
      section: 'object',
      inSideMenu: true,
      requires: ['clickedSat'],
      run: (ctx) => lineManagerInstance.createSatRicFrame(ctx.clickSatObj),
    },
    {
      id: 'line-sat-sun',
      labelKey: 'satelliteToSun',
      section: 'object',
      inSideMenu: true,
      requires: ['clickedSat'],
      run: (ctx) => lineManagerInstance.createSat2Sun(ctx.clickSatObj),
    },
    {
      id: 'line-sat-moon',
      labelKey: 'satelliteToMoon',
      section: 'object',
      inSideMenu: true,
      requires: ['clickedSat'],
      run: (ctx) => lineManagerInstance.createSat2CelestialBody(ctx.clickSatObj, SolarBody.Moon),
    },
    {
      // Two-object line: needs a clicked sat AND a previously selected primary sat, so it is right-click only.
      id: 'line-sat-sat',
      labelKey: 'satelliteToSatellite',
      section: 'object',
      inSideMenu: false,
      requires: ['clickedSat', 'primarySat'],
      run: (ctx) => {
        if (!ctx.primarySatObj) {
          errorManagerInstance.warn(tDraw('errorMsgs.noPrimarySat'));

          return;
        }
        lineManagerInstance.createObjToObj(ctx.clickSatObj, ctx.primarySatObj, rgba(LineColors.BLUE));
      },
    },
    {
      id: 'line-moon-orbit',
      labelKey: 'moonOrbit',
      section: 'object',
      inSideMenu: true,
      requires: [],
      run: () => ServiceLocator.getScene().moons?.Moon?.drawFullOrbitPathRelativeToEarth(),
    },
  ];

  // ===========================================================================
  // Right-click menu
  // ===========================================================================

  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'draw-rmb',
      level1Html: html`<li class="rmb-menu-item" id="draw-rmb"><a href="#">${this.t_('rmbMenu.title')} &#x27A4;</a></li>`,
      level2ElementName: 'draw-rmb-menu',
      level2Html: this.buildRmbL2Html_(),
      order: 5,
      // The axis/grid actions have no requirements, so the entry is always relevant
      isVisible: () => true,
    };
  }

  private buildRmbL2Html_(): string {
    const items = DrawLinesPlugin.DRAW_ACTIONS.map((a) => html`<li id="${a.id}-rmb"><a href="#">${this.t_(`rmbMenu.${a.labelKey}`)}</a></li>`).join('');

    return html`<ul class='dropdown-contents'>${items}</ul>`;
  }

  onContextMenuOpen(ctx: RmbMenuContext): void {
    const sensorManager = ServiceLocator.getSensorManager();

    const flags: Record<DrawRequirement, boolean> = {
      earth: ctx.surface === 'earth',
      clickedSat: ctx.target instanceof Satellite || ctx.target instanceof OemSatellite || ctx.target instanceof MissileObject,
      primarySat: ctx.hasPrimarySelection,
      sensor: sensorManager.isSensorSelected() && sensorManager.whichRadar !== 'CUSTOM',
    };

    for (const action of DrawLinesPlugin.DRAW_ACTIONS) {
      const isAvailable = action.requires.every((requirement) => flags[requirement]);

      if (isAvailable) {
        showEl(`${action.id}-rmb`);
      } else {
        hideEl(`${action.id}-rmb`);
      }
    }
  }

  onContextMenuAction(targetId: string, clickedSat?: number): void {
    const action = DrawLinesPlugin.DRAW_ACTIONS.find((a) => `${a.id}-rmb` === targetId);

    if (!action) {
      return;
    }

    action.run(this.buildRmbContext_(clickedSat));
  }

  // ===========================================================================
  // Side menu (v13)
  // ===========================================================================

  sideMenuElementName = 'draw-lines-menu';
  sideMenuElementHtml = html`
    <div id="draw-lines-menu" class="side-menu-parent start-hidden text-select kt-ui-v13">
      <div id="draw-lines-content" class="side-menu">
        <section class="kt-section">
          <div class="kt-section-label">${this.t_('sections.activeLines')}</div>
          <div id="draw-lines-active-list" class="draw-lines-list"></div>
          <button id="draw-lines-clear-all" class="kt-action draw-lines-standalone-action waves-effect waves-light" type="button">
            <span class="kt-action-label">${this.t_('clearAll')}</span>
          </button>
        </section>
        <section class="kt-section">
          <div class="kt-section-label">${this.t_('sections.referenceGeometry')}</div>
          <div class="input-field kt-field-row draw-lines-field">
            <select id="draw-lines-frame">
              <option value="${ReferenceFrame.J2000}" selected>J2000 (ECI)</option>
              <option value="${ReferenceFrame.TEME}">TEME</option>
            </select>
            <label>${this.t_('referenceFrameLabel')}</label>
          </div>
          ${this.buildActionRows_('axes')}
        </section>
        <section class="kt-section">
          <div class="kt-section-label">${this.t_('sections.objectLines')}</div>
          ${this.buildActionRows_('object')}
        </section>
      </div>
    </div>`;

  bottomIconCallback = (): void => {
    this.refreshActiveList_();
  };

  private buildActionRows_(section: 'axes' | 'object'): string {
    return DrawLinesPlugin.DRAW_ACTIONS.filter((a) => a.section === section && a.inSideMenu)
      .map(
        (a) => html`
        <button id="${a.id}-btn" class="kt-action waves-effect waves-light" type="button">
          <span class="kt-action-label">${this.t_(`rmbMenu.${a.labelKey}`)}</span>
        </button>`
      )
      .join('');
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'l',
        shift: true,
        callback: () => {
          lineManagerInstance.clear();
        },
      },
    ];
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      initMaterialSelects(getEl(this.sideMenuElementName, true) ?? document.body);
      this.wireMenuButtons_();
      this.refreshActiveList_();
    });

    EventBus.getInstance().on(EventBusEvent.onLineAdded, () => {
      this.scheduleListRefresh_();
    });
  }

  // ===========================================================================
  // Context builders
  // ===========================================================================

  private getSelectedFrame_(): ReferenceFrame {
    const select = getEl('draw-lines-frame', true) as HTMLSelectElement | null;

    return select?.value === ReferenceFrame.TEME ? ReferenceFrame.TEME : ReferenceFrame.J2000;
  }

  private buildRmbContext_(clickedSat?: number): DrawActionContext {
    const obj = ServiceLocator.getCatalogManager().getObject(clickedSat);
    const clickSatObj = obj instanceof Satellite || obj instanceof OemSatellite || obj instanceof MissileObject ? obj : null;

    return {
      clickSatObj,
      primarySatObj: PluginRegistry.getPlugin(SelectSatManager)?.primarySatObj ?? null,
      sensor: ServiceLocator.getSensorManager().getSensor(),
      referenceFrame: this.getSelectedFrame_(),
    };
  }

  private buildMenuContext_(): DrawActionContext {
    const selectManager = PluginRegistry.getPlugin(SelectSatManager);
    const selectedSatObj = selectManager && selectManager.selectedSat !== -1 ? selectManager.primarySatObj : null;

    return {
      clickSatObj: selectedSatObj,
      primarySatObj: selectedSatObj,
      sensor: ServiceLocator.getSensorManager().getSensor(),
      referenceFrame: this.getSelectedFrame_(),
    };
  }

  // ===========================================================================
  // Side-menu wiring
  // ===========================================================================

  private wireMenuButtons_(): void {
    for (const action of DrawLinesPlugin.DRAW_ACTIONS) {
      if (!action.inSideMenu) {
        continue;
      }

      getEl(`${action.id}-btn`, true)?.addEventListener('click', () => this.runMenuAction_(action));
    }

    getEl('draw-lines-clear-all', true)?.addEventListener('click', () => lineManagerInstance.clear());
  }

  private runMenuAction_(action: DrawAction): void {
    const ctx = this.buildMenuContext_();

    if (action.requires.includes('clickedSat') && !ctx.clickSatObj) {
      errorManagerInstance.warn(this.t_('errorMsgs.noSatSelected'));

      return;
    }

    action.run(ctx);
  }

  // ===========================================================================
  // Active-lines list
  // ===========================================================================

  private isListRefreshPending_ = false;

  private scheduleListRefresh_(): void {
    if (this.isListRefreshPending_ || typeof requestAnimationFrame !== 'function') {
      this.refreshActiveList_();

      return;
    }

    this.isListRefreshPending_ = true;
    requestAnimationFrame(() => {
      this.isListRefreshPending_ = false;
      this.refreshActiveList_();
    });
  }

  private lineTypeLabel_(kind: string, detail?: string): string {
    const base = this.t_(`lineTypes.${kind}`) || this.t_('lineTypes.generic');

    return typeof detail === 'string' && detail.length > 0 ? `${base}: ${detail}` : base;
  }

  private groupLines_(): { kind: string; detail?: string; label: string; count: number }[] {
    const groups = new Map<string, { kind: string; detail?: string; label: string; count: number }>();

    for (const line of lineManagerInstance.lines) {
      const { kind, detail } = line.getDescription();
      const key = `${kind}|${detail ?? ''}`;
      const existing = groups.get(key);

      if (existing) {
        existing.count++;
      } else {
        groups.set(key, { kind, detail, label: this.lineTypeLabel_(kind, detail), count: 1 });
      }
    }

    return [...groups.values()];
  }

  private refreshActiveList_(): void {
    const listEl = getEl('draw-lines-active-list', true);

    if (!listEl) {
      return;
    }

    const groups = this.groupLines_();

    listEl.replaceChildren();

    if (groups.length === 0) {
      const empty = document.createElement('div');

      empty.className = 'draw-lines-empty';
      empty.textContent = this.t_('emptyList');
      listEl.appendChild(empty);

      return;
    }

    for (const group of groups) {
      const row = document.createElement('div');

      row.className = 'draw-lines-row';

      const label = document.createElement('span');

      label.className = 'draw-lines-row-label';
      label.textContent = group.count > 1 ? `${group.label} (${group.count})` : group.label;

      const removeBtn = document.createElement('button');

      removeBtn.type = 'button';
      removeBtn.className = 'draw-lines-remove';
      removeBtn.setAttribute('aria-label', this.t_('remove'));
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => lineManagerInstance.removeLinesByKind(group.kind, group.detail));

      row.appendChild(label);
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    }
  }
}
