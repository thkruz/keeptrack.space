/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { compressToGzip, decompressFromGzip } from '@app/engine/utils/compression';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import landscape3Png from '@public/img/icons/landscape3.png';
import { saveAs } from 'file-saver';
import { syncFormFields, validateDateInput } from './scenario-form-utils';
import './scenario-management.css';
import { ScenarioData, ScenarioManagementPlugin } from './scenario-management';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.ScenarioManagementMenu.${key}` as Parameters<typeof t7e>[0]);

export class ScenarioManagementMenu extends KeepTrackPlugin {
  readonly id = 'ScenarioManagementMenu';
  dependencies_ = [ScenarioManagementPlugin.name];

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

  bottomIconElementName: string = 'scenario-management-icon';
  bottomIconImg = landscape3Png;
  protected formPrefix_ = 'scenario-management-form';
  sideMenuElementName: string = 'scenario-management-menu';

  private corePlugin_!: ScenarioManagementPlugin;

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/scenario-management/scenario-management-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.windowHeading'),
          content: l('help.window'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
    };
  }

  sideMenuElementHtml: string = html`
  <div id="scenario-management-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="scenario-management-content" class="side-menu">
      <form id="${this.formPrefix_}-form">
        <section class="kt-section">
          <div class="kt-section-label">${l('sideMenuTitle')}</div>
          <div id="${this.formPrefix_}-general">
            <!-- Scenario Name -->
            <div class="kt-field-row">
              <div class="input-field col s12">
                <input required id="${this.formPrefix_}-name" type="text" kt-tooltip="${l('tooltips.name')}">
                <label class="active" for="${this.formPrefix_}-name">${l('labels.scenarioName')}</label>
              </div>
            </div>
            <!-- Scenario Description -->
            <div class="kt-field-row">
              <div class="input-field col s12">
                <input id="${this.formPrefix_}-description" type="text"
                kt-tooltip="${l('tooltips.description')}" placeholder="${l('placeholders.description')}">
                <label class="active" for="${this.formPrefix_}-description">${l('labels.description')}</label>
              </div>
            </div>
            <!-- Scenario Start DateTime -->
            <div class="kt-field-row">
              <div class="input-field col s12">
                <input id="${this.formPrefix_}-start-date" type="text"
                  kt-tooltip="${l('tooltips.startDate')}" placeholder="YYYY-MM-DD HH:MM:SS.sss"
                >
                <label class="active" for="${this.formPrefix_}-start-date">${l('labels.scenarioStart')}</label>
              </div>
            </div>
            <!-- Scenario End DateTime -->
            <div class="kt-field-row">
              <div class="input-field col s12">
                <input id="${this.formPrefix_}-end-date" type="text"
                  kt-tooltip="${l('tooltips.endDate')}" placeholder="YYYY-MM-DD HH:MM:SS.sss"
                >
                <label class="active" for="${this.formPrefix_}-end-date">${l('labels.scenarioEnd')}</label>
              </div>
            </div>
          </div>
        </section>
        <button id="${this.formPrefix_}-submit" class="kt-action waves-effect" type="submit" name="action">
          <span class="kt-action-label">${l('buttons.updateScenario')}</span>
        </button>
        <button id="${this.formPrefix_}-clear-bounds" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${l('buttons.clearTimeBounds')}</span>
        </button>
      </form>
      <section class="kt-section">
        <div class="kt-section-label">${l('sections.actions')}</div>
        <button id="${this.formPrefix_}-save" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${l('buttons.saveScenario')}</span>
        </button>
        <button id="${this.formPrefix_}-load" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${l('buttons.loadScenario')}</span>
        </button>
      </section>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();

    this.corePlugin_ = PluginRegistry.getPlugin(ScenarioManagementPlugin)!;

    const nameInput = getEl(`${this.formPrefix_}-name`) as HTMLInputElement;
    const descriptionInput = getEl(`${this.formPrefix_}-description`) as HTMLInputElement;

    if (nameInput) {
      nameInput.value = this.corePlugin_.defaultScenarioName;
    }
    if (descriptionInput) {
      descriptionInput.value = this.corePlugin_.defaultScenarioDescription;
    }

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl(`${this.formPrefix_}-start-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-end-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-form`)?.addEventListener('submit', this.onSubmit_.bind(this));
        getEl(`${this.formPrefix_}-clear-bounds`)?.addEventListener('click', this.onClearBounds_.bind(this));
        getEl(`${this.formPrefix_}-save`)?.addEventListener('click', this.onSave_.bind(this));
        getEl(`${this.formPrefix_}-load`)?.addEventListener('click', this.onLoad_.bind(this));
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.scenarioUpdated, () => {
      syncFormFields(this.formPrefix_, this.corePlugin_.scenario);
    });
  }

  protected onSubmit_(e?: Event): void {
    e?.preventDefault();

    const nameInput = getEl(`${this.formPrefix_}-name`) as HTMLInputElement;
    const descriptionInput = getEl(`${this.formPrefix_}-description`) as HTMLInputElement;
    const startDateInput = getEl(`${this.formPrefix_}-start-date`) as HTMLInputElement;
    const endDateInput = getEl(`${this.formPrefix_}-end-date`) as HTMLInputElement;

    const name = nameInput.value;
    const description = descriptionInput.value;
    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    if (!name) {
      errorManagerInstance.warn(l('errorMsgs.nameRequired'));

      return;
    }

    if (startDateStr && !validateDateInput(startDateInput)) {
      errorManagerInstance.warn(l('errorMsgs.startDateInvalid'));

      return;
    }

    if (endDateStr && !validateDateInput(endDateInput)) {
      errorManagerInstance.warn(l('errorMsgs.endDateInvalid'));

      return;
    }

    const newStartTime = startDateStr ? new Date(`${startDateStr}Z`) : null;
    const newEndTime = endDateStr ? new Date(`${endDateStr}Z`) : null;

    const isUpdateSuccess = this.corePlugin_.updateScenario({
      name,
      description,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    // Only show toast if button was clicked
    if (e && isUpdateSuccess) {
      ServiceLocator.getUiManager().toast(l('msgs.settingsUpdated'), ToastMsgType.normal);
    }
  }

  protected onDateChange_(e: Event): void {
    const input = e.target as HTMLInputElement;

    validateDateInput(input);
  }

  /**
   * Clears the scenario time window, returning to endless mode. Empties both
   * date fields and commits explicit nulls so the simulation clock is no longer
   * clamped to a window.
   */
  protected onClearBounds_(): void {
    for (const id of [`${this.formPrefix_}-start-date`, `${this.formPrefix_}-end-date`]) {
      const input = getEl(id) as HTMLInputElement | null;

      if (input) {
        input.value = '';
        input.classList.remove('invalid', 'valid');
      }
    }

    if (this.corePlugin_.updateScenario({ startTime: null, endTime: null })) {
      ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
      ServiceLocator.getUiManager().toast(l('msgs.boundsCleared'), ToastMsgType.normal);
    }
  }

  protected async onSave_(evt: Event): Promise<void> {
    evt.preventDefault();
    this.onSubmit_();
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);

    const scenario = this.corePlugin_.scenario;
    const file = {
      version: '3.0' as const,
      scenario: {
        name: scenario.name,
        description: scenario.description,
        ...(scenario.startTime ? { startTime: scenario.startTime.toISOString() } : {}),
        ...(scenario.endTime ? { endTime: scenario.endTime.toISOString() } : {}),
      },
    };

    try {
      const compressed = await compressToGzip(JSON.stringify(file));
      const blob = new Blob([compressed.buffer as ArrayBuffer], { type: 'application/gzip' });

      saveAs(blob, `keeptrack-scenario-${scenario.name}.kts`);
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'scenario-management-menu.ts', l('errorMsgs.savingScenario'));
      }
    }
  }

  protected onLoad_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.kts,application/gzip';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.files && target.files.length > 0) {
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target?.result instanceof ArrayBuffer) {
            decompressFromGzip(new Uint8Array(event.target.result)).then((json) => {
              try {
                const parsed = JSON.parse(json);
                const scenario = parsed.scenario;
                const scenarioData: Partial<ScenarioData> = {
                  name: scenario.name,
                  description: scenario.description || '',
                  startTime: scenario.startTime ? new Date(scenario.startTime) : null,
                  endTime: scenario.endTime ? new Date(scenario.endTime) : null,
                };

                if (this.corePlugin_.updateScenario(scenarioData)) {
                  ServiceLocator.getUiManager().toast(l('msgs.scenarioLoaded'), ToastMsgType.normal);
                }
              } catch (error) {
                errorManagerInstance.error(error, 'scenario-management-menu.ts', l('errorMsgs.loadingScenarioFile'));
              }
            }).catch((error: Error) => {
              errorManagerInstance.error(error, 'scenario-management-menu.ts', l('errorMsgs.decompressingScenarioFile'));
            });
          }
        };
        reader.readAsArrayBuffer(target.files[0]);
      }
    };

    input.click();
  }
}
