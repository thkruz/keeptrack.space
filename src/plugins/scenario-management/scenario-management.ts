import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { keepTrackApi } from '@app/keepTrackApi';
import landscape3Png from '@public/img/icons/landscape3.png';
import { saveAs } from 'file-saver';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';

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

declare module '@app/engine/core/interfaces' {
  interface UserSettings {
    scenarioStartTime: Date | null;
    scenarioEndTime: Date | null;
  }
}

export interface ScenarioData {
  name: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
}

interface ScenarioFile {
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

export class ScenarioManagementPlugin extends KeepTrackPlugin {
  readonly id = 'ScenarioManagementPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  defaultScenarioName = 'My Scenario';
  defaultScenarioDescription = 'Description of My Scenario';

  bottomIconElementName: string = 'scenario-management-icon';
  bottomIconImg = landscape3Png;
  formPrefix_ = 'scenario-management-form';
  sideMenuElementName: string = 'scenario-management-menu';
  sideMenuElementHtml: string = html`
  <div id="scenario-management-menu" class="side-menu-parent start-hidden text-select">
    <div id="scenario-management-content" class="side-menu">
      <div class="row">
        <form id="${this.formPrefix_}-form">
          <div id="${this.formPrefix_}-general">
            <div class="row center"></div>
            </br>
            <div class="row center">
              <button id="${this.formPrefix_}-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Scenario &#9658;</button>
            </div>
            <h5 class="center-align">Scenario Settings</h5>
            <!-- Scenario Name -->
            <div class="input-field col s12">
              <input required value="${this.defaultScenarioName}" id="${this.formPrefix_}-name" type="text" kt-tooltip="The name of the scenario.">
              <label class="active" for="${this.formPrefix_}-name">Scenario Name</label>
            </div>
            <!-- Scenario Description -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-description" type="text"
              value="${this.defaultScenarioDescription}"
              kt-tooltip="The description of the scenario." placeholder="Enter scenario description here...">
              <label class="active" for="${this.formPrefix_}-description">Description</label>
            </div>
            <!-- Scenario Start DateTime -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-start-date" type="text"
                kt-tooltip="The start DTG of the scenario in UTC (YYYY-MM-DD HH:MM:SS.sss)." placeholder="YYYY-MM-DD HH:MM:SS.sss"
              >
              <label class="active" for="${this.formPrefix_}-start-date">Scenario Start</label>
            </div>
            <!-- Scenario End DateTime -->
            <div class="input-field col s12">
              <input id="${this.formPrefix_}-end-date" type="text"
                kt-tooltip="The end DTG of the scenario in UTC (YYYY-MM-DD HH:MM:SS.sss)." placeholder="YYYY-MM-DD HH:MM:SS.sss"
              >
              <label class="active" for="${this.formPrefix_}-end-date">Scenario End</label>
            </div>
          </div>
        </form>
        <div class="row center">
          <button id="${this.formPrefix_}-save" class="btn btn-ui waves-effect waves-light">Save Scenario &#9658;</button>
        </div>
        <div class="row center">
          <button id="${this.formPrefix_}-load" class="btn btn-ui waves-effect waves-light">Load Scenario &#9658;</button>
        </div>
      </div>
    </div>
  </div>`;

  isNotColorPickerInitialSetup = false;
  scenario: ScenarioData = {
    name: this.defaultScenarioName,
    description: this.defaultScenarioDescription,
    startTime: null,
    endTime: null,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl(`${this.formPrefix_}-start-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-end-date`)?.addEventListener('change', this.onDateChange_.bind(this));
        getEl(`${this.formPrefix_}-form`)?.addEventListener('submit', this.onSubmit_.bind(this));
        getEl(`${this.formPrefix_}-save`)?.addEventListener('click', this.onSave_.bind(this));
        getEl(`${this.formPrefix_}-load`)?.addEventListener('click', this.onLoad_.bind(this));
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.calculateSimulationTime, (simulationTimeObj) => {
      let isOutsideBoundaries = false;

      if (this.scenario.startTime && simulationTimeObj.getTime() < this.scenario.startTime.getTime()) {
        simulationTimeObj.setTime(this.scenario.startTime.getTime());
        keepTrackApi.toast('Simulation time is before the scenario start time. Pausing at start time.', ToastMsgType.caution, true);
        isOutsideBoundaries = true;
      }

      if (this.scenario.endTime && simulationTimeObj.getTime() > this.scenario.endTime.getTime()) {
        simulationTimeObj.setTime(this.scenario.endTime.getTime());
        keepTrackApi.toast('Simulation time is after the scenario stop time. Pausing at stop time.', ToastMsgType.caution, true);
        isOutsideBoundaries = true;
      }

      if (isOutsideBoundaries) {
        const today = new Date();
        const timeManagerInstance = keepTrackApi.getTimeManager();

        timeManagerInstance.dynamicOffsetEpoch = Date.now();
        timeManagerInstance.staticOffset = timeManagerInstance.simulationTimeObj.getTime() - today.getTime();
        timeManagerInstance.changePropRate(0, false); // Pause without toast
        timeManagerInstance.synchronize();
        keepTrackApi.emit(EventBusEvent.staticOffsetChange, timeManagerInstance.staticOffset);
      }
    });
  }

  updateScenario(partialScenario: Partial<ScenarioData>): boolean {
    if (!this.validateScenario_({
      name: partialScenario.name ?? this.scenario.name,
      description: partialScenario.description ?? this.scenario.description,
      startTime: partialScenario.startTime ?? this.scenario.startTime,
      endTime: partialScenario.endTime ?? this.scenario.endTime,
    })) {
      return false;
    }

    this.scenario = {
      ...this.scenario,
      ...partialScenario,
    };

    (getEl(`${this.formPrefix_}-name`) as HTMLInputElement).value = this.scenario.name;
    (getEl(`${this.formPrefix_}-description`) as HTMLInputElement).value = this.scenario.description;

    // If start time changes, update the dom element
    if (partialScenario.startTime) {
      const startDateInput = getEl(`${this.formPrefix_}-start-date`) as HTMLInputElement;

      if (startDateInput) {
        startDateInput.value = partialScenario.startTime
          ? partialScenario.startTime.toISOString().replace('T', ' ').replace('Z', '')
          : '';
      }
    }

    // If end time changes, update the dom element
    if (partialScenario.endTime) {
      const endDateInput = getEl(`${this.formPrefix_}-end-date`) as HTMLInputElement;

      if (endDateInput) {
        endDateInput.value = partialScenario.endTime
          ? partialScenario.endTime.toISOString().replace('T', ' ').replace('Z', '')
          : '';
      }
    }

    return true;
  }

  private onSubmit_(e?: Event): void {
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
      errorManagerInstance.warn('Scenario Name is required.');

      return;
    }

    if (startDateStr && !this.validateDate_(startDateInput)) {
      errorManagerInstance.warn('Start Date is invalid.');

      return;
    }

    if (endDateStr && !this.validateDate_(endDateInput)) {
      errorManagerInstance.warn('End Date is invalid.');

      return;
    }

    // Here you would typically save these settings to your application's state or backend
    const newStartTime = startDateStr ? new Date(`${startDateStr}Z`) : null;
    const newEndTime = endDateStr ? new Date(`${endDateStr}Z`) : null;

    const isUpdateSuccess = this.updateScenario({
      name,
      description,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    // Only show toast if button was clicked
    if (e && isUpdateSuccess) {
      keepTrackApi.toast('Scenario settings updated successfully!', ToastMsgType.normal);
    }
  }

  private onDateChange_(e: Event): void {
    const input = e.target as HTMLInputElement;

    this.validateDate_(input);
  }

  private validateScenario_(scenario: ScenarioData): boolean {
    if (scenario.startTime && scenario.endTime && scenario.startTime >= scenario.endTime) {
      errorManagerInstance.warn('Scenario start time must be before end time.');

      return false;
    }

    // Must be valid dates or null
    if (
      (scenario.startTime && isNaN(scenario.startTime.getTime())) ||
      (scenario.endTime && isNaN(scenario.endTime.getTime()))
    ) {
      errorManagerInstance.warn('Scenario start time and end time must be valid dates.');

      return false;
    }

    // if start or end then there must be both
    if ((scenario.startTime && !scenario.endTime) || (!scenario.startTime && scenario.endTime)) {
      errorManagerInstance.warn('Both scenario start time and end time must be set.');

      return false;
    }

    // Name must be less than 30 characters
    if (scenario.name.length > 30) {
      errorManagerInstance.warn('Scenario name must be less than 30 characters.');

      return false;
    }

    return true;
  }

  private validateDate_(input: HTMLInputElement): boolean {
    const dateStr = input.value;

    // Simple regex to validate the format YYYY-MM-DD HH:MM:SS.sss
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/u;

    const isValid = regex.test(dateStr);

    if (!isValid) {
      // Show error message
      input.classList.remove('valid');
      input.classList.add('invalid');
    } else {
      // Remove error message
      input.classList.remove('invalid');
      input.classList.add('valid');
    }

    return isValid;
  }

  private onSave_(evt: Event): void {
    this.onSubmit_();
    keepTrackApi.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    const blob = new Blob([JSON.stringify(this.scenario, null, 2)], {
      type: 'text/plain;charset=utf-8',
    });

    try {
      saveAs(blob, `keeptrack-scenario-${this.scenario.name}.json`);
    } catch (e) {
      if (!isThisNode()) {
        errorManagerInstance.error(e, 'scenario-management.ts', 'Error saving scenario!');
      }
    }
    evt.preventDefault();
  }

  private onLoad_(): void {
    keepTrackApi.getSoundManager()?.play(SoundNames.MENU_BUTTON);
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.json,text/json';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target && typeof event.target.result === 'string') {
            try {
              const scenarioFile: ScenarioFile = JSON.parse(event.target.result);
              const scenarioData = {
                name: scenarioFile.name,
                description: scenarioFile.description || '',
                startTime: scenarioFile.startTime ? new Date(scenarioFile.startTime) : null,
                endTime: scenarioFile.endTime ? new Date(scenarioFile.endTime) : null,
              };

              if (this.updateScenario(scenarioData)) {
                keepTrackApi.toast('Scenario loaded successfully!', ToastMsgType.normal);
              }
            } catch (error) {
              errorManagerInstance.error(error, 'scenario-management.ts', 'Error loading scenario file!');
            }
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }
}
