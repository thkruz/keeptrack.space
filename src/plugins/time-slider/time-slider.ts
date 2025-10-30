import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ScenarioData, ScenarioManagementPlugin } from '../scenario-management/scenario-management';
import { TopMenu } from '../top-menu/top-menu';
import './time-slider.css';

export class TimeSlider extends KeepTrackPlugin {
  readonly id = 'TimeSlider';
  dependencies_ = [ScenarioManagementPlugin.name, TopMenu.name];
  sliderTimeValue: number = 0;
  scenario: ScenarioData | null;

  addHtml() {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        const navWrapperElement = getEl(TopMenu.NAV_WRAPPER_ID);

        if (navWrapperElement) {
          navWrapperElement.parentElement!.insertAdjacentHTML(
            'beforeend',
            html`
            <div id="time-slider-container" class="time-slider-container">
              <div id="time-slider-container-slider" class="ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
                 style="display: inline-block;" data-min="0" data-max="100" data-step="0.1"
                 kt-tooltip="Time Slider: Drag to adjust time of day"
              >
                <span
                  tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default"
                  style="left: ${(this.getSliderValue(ServiceLocator.getTimeManager().simulationTimeObj)).toString()}%;">
                </span>
              </div>
            </div>
          `,
          );
        }
      },
    );
  }

  getSliderValue(date: Date): number {
    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
    // When scenario has no bounds
    if (!this.scenario?.startTime && !this.scenario?.endTime) {
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();

      // Calculate the total minutes in the day
      const totalMinutes = hours * 60 + minutes;

      // Convert total minutes to a percentage of the day (0-100)
      return (totalMinutes / 1439) * 100; // 1439 = 23*60 + 59
    }

    // When scenario has bounds
    const minPosition = this.scenario.startTime as Date;
    const maxPosition = this.scenario.endTime as Date;
    const differenceInMs = maxPosition.getTime() - minPosition.getTime();
    const currentDifferenceInMs = date.getTime() - minPosition.getTime();

    return (currentDifferenceInMs / differenceInMs) * 100;
  }

  addJs() {
    super.addJs();

    this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.attachSliderEvents('time-slider-container-slider', (value: number) => {
        this.scenario = PluginRegistry.getPlugin(ScenarioManagementPlugin)?.scenario ?? null;
        if (!this.scenario?.startTime && !this.scenario?.endTime) {
          this.sliderWithoutBounds(value);
        } else {
          this.sliderWithBounds(value);
        }
      });
    });

    EventBus.getInstance().on(EventBusEvent.selectedDateChange, () => {
      this.updateSliderPosition();
    });

    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      this.updateSliderPosition();
    });
  }

  private sliderWithoutBounds(value: number) {
    const timeManager = ServiceLocator.getTimeManager();
    const currentDate = timeManager.simulationTimeObj;

    // Calculate new hours and minutes based on slider value
    const totalMinutes = Math.floor((value / 100) * 1439); // Total minutes in a day
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    // Update the simulation time object
    const newDate = new Date(currentDate);

    newDate.setUTCHours(newHours, newMinutes, 0, 0);

    const today = new Date();

    timeManager.changeStaticOffset(newDate.getTime() - today.getTime());

    // Notify other components of the time change
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, newDate);
  }

  private sliderWithBounds(value: number) {
    const timeManager = ServiceLocator.getTimeManager();

    const minPosition = this.scenario!.startTime as Date;
    const maxPosition = this.scenario!.endTime as Date;
    const differenceInMs = maxPosition.getTime() - minPosition.getTime();
    const newTimeInMs = minPosition.getTime() + (differenceInMs * (value / 100));

    const newDate = new Date(newTimeInMs);

    timeManager.changeStaticOffset(newDate.getTime() - Date.now());

    // Notify other components of the time change
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, newDate);
  }

  updateSliderPosition() {
    const slider = getEl('time-slider-container-slider');
    const handle = slider?.querySelector('.ui-slider-handle') as HTMLElement | null;

    if (slider && handle) {
      const sliderValue = this.getSliderValue(ServiceLocator.getTimeManager().simulationTimeObj);

      handle.style.left = `${sliderValue}%`;
    }
  }

  private attachSliderEvents(sliderId: string, updateFunction: (value: number) => void): void {
    const slider = document.getElementById(sliderId);

    if (slider) {
      const min = parseInt(slider.getAttribute('data-min') || '0');
      const max = parseInt(slider.getAttribute('data-max') || '59');
      const step = parseFloat(slider.getAttribute('data-step') || '1');
      const handle: HTMLElement | null = slider.querySelector('.ui-slider-handle');

      const updateSliderPosition = (clientX: number) => {
        const rect = slider.getBoundingClientRect();
        let percentage = (clientX - rect.left) / rect.width;

        percentage = Math.max(0, Math.min(1, percentage));
        const value = Math.round((percentage * (max - min) + min) / step) * step;

        if (handle) {
          handle.style.left = `${percentage * 100}%`;
        }
        updateFunction(value);
      };

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      slider.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }
  }
}
