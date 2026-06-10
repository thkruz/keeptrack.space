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

import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

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

export class ScenarioManagementPlugin extends KeepTrackPlugin {
  readonly id = 'ScenarioManagementPlugin';
  dependencies_ = [];

  defaultScenarioName = t7e('plugins.ScenarioManagementMenu.defaults.scenarioName');
  defaultScenarioDescription = t7e('plugins.ScenarioManagementMenu.defaults.scenarioDescription');

  scenario: ScenarioData = {
    name: this.defaultScenarioName,
    description: this.defaultScenarioDescription,
    startTime: null,
    endTime: null,
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.calculateSimulationTime, (simulationTimeObj) => {
      let isOutsideBoundaries = false;

      if (this.scenario.startTime && simulationTimeObj.getTime() < this.scenario.startTime.getTime()) {
        simulationTimeObj.setTime(this.scenario.startTime.getTime());
        ServiceLocator.getUiManager().toast(t7e('plugins.ScenarioManagementMenu.core.beforeStartTime'), ToastMsgType.caution, true);
        isOutsideBoundaries = true;
      }

      if (this.scenario.endTime && simulationTimeObj.getTime() > this.scenario.endTime.getTime()) {
        simulationTimeObj.setTime(this.scenario.endTime.getTime());
        ServiceLocator.getUiManager().toast(t7e('plugins.ScenarioManagementMenu.core.afterStopTime'), ToastMsgType.caution, true);
        isOutsideBoundaries = true;
      }

      if (isOutsideBoundaries) {
        const today = new Date();
        const timeManagerInstance = ServiceLocator.getTimeManager();

        timeManagerInstance.dynamicOffsetEpoch = Date.now();
        timeManagerInstance.staticOffset = timeManagerInstance.simulationTimeObj.getTime() - today.getTime();
        timeManagerInstance.changePropRate(0, false); // Pause without toast
        timeManagerInstance.synchronize();
        EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, timeManagerInstance.staticOffset);
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

    const oldStart = this.scenario.startTime?.getTime() ?? null;
    const oldEnd = this.scenario.endTime?.getTime() ?? null;

    this.scenario = {
      ...this.scenario,
      ...partialScenario,
    };

    const newStart = this.scenario.startTime?.getTime() ?? null;
    const newEnd = this.scenario.endTime?.getTime() ?? null;

    if (oldStart !== newStart || oldEnd !== newEnd) {
      EventBus.getInstance().emit(EventBusEvent.scenarioBoundsChanged, this.scenario);
    }

    EventBus.getInstance().emit(EventBusEvent.scenarioUpdated, this.scenario);

    return true;
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
}
