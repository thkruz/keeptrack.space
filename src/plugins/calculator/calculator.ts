import { MenuMode } from '@app/engine/core/interfaces';
import calculatorPng from '@public/img/icons/calculator.png';

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { Degrees, DetailedSensor, ecf2eci, eci2ecf, eci2rae, Kilometers, rae2eci, RaeVec3, Vector3D } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { ServiceLocator } from '@app/engine/core/service-locator';

enum CalculatorMode {
  ITRF = 'ITRF',
  J2000 = 'J2000',
  RAE = 'RAE',
}

export class Calculator extends KeepTrackPlugin {
  readonly id = 'Calculator';
  protected dependencies_ = [];
  bottomIconImg = calculatorPng;
  currentMode: CalculatorMode = CalculatorMode.ITRF;
  sensorUsedInCalculation: DetailedSensor | null = null;

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  sideMenuElementName = 'calculator-menu';
  private readonly itrfHtml = html`
  <div>
    <form id="calculator">
      <div class="center-align row">
          ITRF
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-x-input" type="text" />
          <label for="calc-itrf-x-input" class="active">ITRF X</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-y-input" type="text" />
          <label for="calc-itrf-y-input" class="active">ITRF Y</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-z-input" type="text" />
          <label for="calc-itrf-z-input" class="active">ITRF Z</label>
        </div>
      </div>
      <div class="center-align row">
        <button id="calculator-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Convert &#9658;</button>
      </div>
    </form>

    <br />
    <br />

    <div class="center-align row">
          J2000
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-j2000-x-input" type="text" />
          <label for="calc-j2000-x-input" class="active">J2000 X</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-j2000-y-input" type="text" />
          <label for="calc-j2000-y-input" class="active">J2000 Y</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-j2000-z-input" type="text" />
          <label for="calc-j2000-z-input" class="active">J2000 Z</label>
        </div>
      </div>

      <div class="center-align row">
          RAE
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="Sensor Name" id="calc-sensor-name" type="text" readonly />
          <label for="calc-sensor-name" class="active">Sensor Name</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-r-input" type="text" />
          <label for="calc-rae-r-input" class="active">Range</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-a-input" type="text" />
          <label for="calc-rae-a-input" class="active">Azimuth</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-e-input" type="text" />
          <label for="calc-rae-e-input" class="active">Elevation</label>
        </div>
      </div>

      <div class="center-align row">
        <button id="calculator-draw-line" class="btn btn-ui waves-effect waves-light" type="button" name="action">Draw Line</button>
      </div>
  </div>
  `;
  private readonly raeHtml = html`
  <div>
    <form id="calculator">
      <div class="center-align row">
          RAE
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="Sensor Name" id="calc-sensor-name" type="text" readonly />
          <label for="calc-sensor-name" class="active">Sensor Name</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-r-input" type="text" />
          <label for="calc-rae-r-input" class="active">Range</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-a-input" type="text" />
          <label for="calc-rae-a-input" class="active">Azimuth</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-e-input" type="text" />
          <label for="calc-rae-e-input" class="active">Elevation</label>
        </div>
      </div>
      <div class="center-align row">
        <button id="calculator-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Convert &#9658;</button>
      </div>
    </form>

    <br />
    <br />

    <div class="center-align row">
      J2000
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input value="3000" id="calc-j2000-x-input" type="text" />
        <label for="calc-j2000-x-input" class="active">J2000 X</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input value="3000" id="calc-j2000-y-input" type="text" />
        <label for="calc-j2000-y-input" class="active">J2000 Y</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input value="3000" id="calc-j2000-z-input" type="text" />
          <label for="calc-j2000-z-input" class="active">J2000 Z</label>
        </div>
      </div>

      <div class="center-align row">
          ITRF
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-x-input" type="text" />
          <label for="calc-itrf-x-input" class="active">ITRF X</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-y-input" type="text" />
          <label for="calc-itrf-y-input" class="active">ITRF Y</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-z-input" type="text" />
          <label for="calc-itrf-z-input" class="active">ITRF Z</label>
        </div>
      </div>

      <div class="center-align row">
        <button id="calculator-draw-line" class="btn btn-ui waves-effect waves-light" type="button" name="action">Draw Line</button>
      </div>
  </div>
  `;
  private readonly j2000Html = html`
  <div>
    <form id="calculator">
      <div class="center-align row">
            J2000
          </div>
        <div class="row">
          <div class="input-field col s12">
            <input value="3000" id="calc-j2000-x-input" type="text" />
            <label for="calc-j2000-x-input" class="active">J2000 X</label>
          </div>
        </div>
        <div class="row">
          <div class="input-field col s12">
            <input value="3000" id="calc-j2000-y-input" type="text" />
            <label for="calc-j2000-y-input" class="active">J2000 Y</label>
          </div>
        </div>
        <div class="row">
          <div class="input-field col s12">
            <input value="3000" id="calc-j2000-z-input" type="text" />
            <label for="calc-j2000-z-input" class="active">J2000 Z</label>
          </div>
        </div>
        <div class="center-align row">
          <button id="calculator-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Convert &#9658;</button>
        </div>
      </form>

      <br />
      <br />

      <div class="center-align row">
          ITRF
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-x-input" type="text" />
          <label for="calc-itrf-x-input" class="active">ITRF X</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-y-input" type="text" />
          <label for="calc-itrf-y-input" class="active">ITRF Y</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-itrf-z-input" type="text" />
          <label for="calc-itrf-z-input" class="active">ITRF Z</label>
        </div>
      </div>

      <div class="center-align row">
          RAE
        </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="Sensor Name" id="calc-sensor-name" type="text" readonly />
          <label for="calc-sensor-name" class="active">Sensor Name</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-r-input" type="text" />
          <label for="calc-rae-r-input" class="active">Range</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-a-input" type="text" />
          <label for="calc-rae-a-input" class="active">Azimuth</label>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <input value="3000" id="calc-rae-e-input" type="text" />
          <label for="calc-rae-e-input" class="active">Elevation</label>
        </div>
      </div>

      <div class="center-align row">
        <button id="calculator-draw-line" class="btn btn-ui waves-effect waves-light" type="button" name="action">Draw Line</button>
      </div>
  </div>
  `;

  sideMenuElementHtml = html`
    <div id="calculator-content-wrapper">
      ${this.itrfHtml}
    </div>`;
  sideMenuSecondaryHtml = html`
  <div>
    <div class="center-align row">
      <button id="calculator-itrf" class="btn btn-ui waves-effect waves-light" type="button" name="action">ITRF</button>
    </div>
    <div class="center-align row">
      <button id="calculator-j2000" class="btn btn-ui waves-effect waves-light" type="button" name="action">J2000</button>
    </div>
    <div class="center-align row">
      <button id="calculator-rae" class="btn btn-ui waves-effect waves-light" type="button" name="action">RAE</button>
    </div>
  </div>
`;


  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 350,
  };

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        // Nothing to do here
      },
    );
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('calculator-itrf')!.addEventListener('click', () => {
          this.changeToITRF_();
        });

        getEl('calculator-j2000')!.addEventListener('click', () => {
          this.changeToJ2000_();
        });

        getEl('calculator-rae')!.addEventListener('click', () => {
          this.changeToRAE_();
        });

        this.addRemovableListeners();
      },
    );
  }

  /**
   * Adds event listeners to the calculator elements that can be removed later.
   *
   * This method attaches click event listeners to the elements with IDs
   * 'calculator-draw-line' and 'calculator-submit'. When the 'calculator-draw-line'
   * element is clicked, the `drawLine_` method is called. When the 'calculator-submit'
   * element is clicked, the default form submission is prevented and the `handleSubmit_`
   * method is called.
   *
   * @private
   */
  private addRemovableListeners() {
    getEl('calculator-draw-line')!.addEventListener('click', () => {
      this.drawLine_();
    });

    getEl('calculator-submit')!.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSubmit_();
    });
  }

  private handleSubmit_(): void {
    switch (this.currentMode) {
      case CalculatorMode.ITRF:
        this.calculateITRF_();
        break;
      case CalculatorMode.J2000:
        this.calculateJ2000_();
        break;
      case CalculatorMode.RAE:
        this.calculateRAE_();
        break;
      default:
        errorManagerInstance.warn('Invalid calculator mode');
    }
  }

  private calculateITRF_(): void {
    const x = getEl('calc-itrf-x-input') as HTMLInputElement;
    const y = getEl('calc-itrf-y-input') as HTMLInputElement;
    const z = getEl('calc-itrf-z-input') as HTMLInputElement;

    if (isNaN(Number(x.value)) || isNaN(Number(y.value)) || isNaN(Number(z.value))) {
      errorManagerInstance.warn('Invalid input for ITRF. It must be a number.');

      return;
    }

    const ecf = new Vector3D<Kilometers>(Number(x.value) as Kilometers, Number(y.value) as Kilometers, Number(z.value) as Kilometers);
    const date = ServiceLocator.getTimeManager().simulationTimeObj;
    const gmst = ServiceLocator.getTimeManager().gmst;
    const eci = ecf2eci(ecf, gmst);

    (getEl('calc-j2000-x-input') as HTMLInputElement).value = eci.x.toString();
    (getEl('calc-j2000-y-input') as HTMLInputElement).value = eci.y.toString();
    (getEl('calc-j2000-z-input') as HTMLInputElement).value = eci.z.toString();

    const currentSensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!currentSensor) {
      (getEl('calc-sensor-name') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-r-input') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-a-input') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-e-input') as HTMLInputElement).value = 'No sensor selected';
    } else {
      const rae = eci2rae(date, eci, currentSensor);

      this.sensorUsedInCalculation = new DetailedSensor(currentSensor);

      (getEl('calc-sensor-name') as HTMLInputElement).value = currentSensor.name;
      (getEl('calc-rae-r-input') as HTMLInputElement).value = rae.rng.toString();
      (getEl('calc-rae-a-input') as HTMLInputElement).value = rae.az.toString();
      (getEl('calc-rae-e-input') as HTMLInputElement).value = rae.el.toString();
    }
  }

  private calculateJ2000_(): void {
    const x = getEl('calc-j2000-x-input') as HTMLInputElement;
    const y = getEl('calc-j2000-y-input') as HTMLInputElement;
    const z = getEl('calc-j2000-z-input') as HTMLInputElement;

    if (isNaN(Number(x.value)) || isNaN(Number(y.value)) || isNaN(Number(z.value))) {
      errorManagerInstance.warn('Invalid input for J2000. It must be a number.');

      return;
    }

    const eci = new Vector3D<Kilometers>(Number(x.value) as Kilometers, Number(y.value) as Kilometers, Number(z.value) as Kilometers);
    const date = ServiceLocator.getTimeManager().simulationTimeObj;
    const gmst = ServiceLocator.getTimeManager().gmst;
    const ecf = eci2ecf(eci, gmst);

    (getEl('calc-itrf-x-input') as HTMLInputElement).value = ecf.x.toString();
    (getEl('calc-itrf-y-input') as HTMLInputElement).value = ecf.y.toString();
    (getEl('calc-itrf-z-input') as HTMLInputElement).value = ecf.z.toString();

    const currentSensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!currentSensor) {
      (getEl('calc-sensor-name') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-r-input') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-a-input') as HTMLInputElement).value = 'No sensor selected';
      (getEl('calc-rae-e-input') as HTMLInputElement).value = 'No sensor selected';
    } else {
      const rae = eci2rae(date, eci, currentSensor);

      this.sensorUsedInCalculation = new DetailedSensor(currentSensor);

      (getEl('calc-sensor-name') as HTMLInputElement).value = currentSensor.name;
      (getEl('calc-rae-r-input') as HTMLInputElement).value = rae.rng.toString();
      (getEl('calc-rae-a-input') as HTMLInputElement).value = rae.az.toString();
      (getEl('calc-rae-e-input') as HTMLInputElement).value = rae.el.toString();
    }
  }

  private calculateRAE_(): void {
    const r = getEl('calc-rae-r-input') as HTMLInputElement;
    const a = getEl('calc-rae-a-input') as HTMLInputElement;
    const e = getEl('calc-rae-e-input') as HTMLInputElement;

    if (isNaN(Number(r.value)) || isNaN(Number(a.value)) || isNaN(Number(e.value))) {
      errorManagerInstance.warn('Invalid input for RAE. It must be a number.');

      return;
    }

    const sensor = ServiceLocator.getSensorManager().currentSensors[0];

    if (!sensor) {
      errorManagerInstance.warn('No sensor selected');

      return;
    }

    const rae = {
      rng: Number(r.value) as Kilometers,
      az: Number(a.value) as Degrees,
      el: Number(e.value) as Degrees,
    } as RaeVec3<Kilometers>;
    const eci = rae2eci(rae, sensor.lla(), ServiceLocator.getTimeManager().gmst);

    (getEl('calc-j2000-x-input') as HTMLInputElement).value = eci.x.toString();
    (getEl('calc-j2000-y-input') as HTMLInputElement).value = eci.y.toString();
    (getEl('calc-j2000-z-input') as HTMLInputElement).value = eci.z.toString();

    const ecf = eci2ecf(eci, ServiceLocator.getTimeManager().gmst);

    (getEl('calc-itrf-x-input') as HTMLInputElement).value = ecf.x.toString();
    (getEl('calc-itrf-y-input') as HTMLInputElement).value = ecf.y.toString();
    (getEl('calc-itrf-z-input') as HTMLInputElement).value = ecf.z.toString();
  }

  private changeToITRF_(): void {
    this.currentMode = CalculatorMode.ITRF;

    getEl('calculator-content-wrapper')!.innerHTML = this.itrfHtml;
    this.addRemovableListeners();

    const x = getEl('calc-itrf-x-input') as HTMLInputElement;
    const y = getEl('calc-itrf-y-input') as HTMLInputElement;
    const z = getEl('calc-itrf-z-input') as HTMLInputElement;

    x.value = '3000';
    y.value = '3000';
    z.value = '3000';
  }

  private changeToJ2000_(): void {
    this.currentMode = CalculatorMode.J2000;

    getEl('calculator-content-wrapper')!.innerHTML = this.j2000Html;
    this.addRemovableListeners();

    const x = getEl('calc-itrf-x-input') as HTMLInputElement;
    const y = getEl('calc-itrf-y-input') as HTMLInputElement;
    const z = getEl('calc-itrf-z-input') as HTMLInputElement;

    x.value = '3000';
    y.value = '3000';
    z.value = '3000';
  }

  private changeToRAE_(): void {
    this.currentMode = CalculatorMode.RAE;

    getEl('calculator-content-wrapper')!.innerHTML = this.raeHtml;
    this.addRemovableListeners();

    const x = getEl('calc-itrf-x-input') as HTMLInputElement;
    const y = getEl('calc-itrf-y-input') as HTMLInputElement;
    const z = getEl('calc-itrf-z-input') as HTMLInputElement;

    x.value = '3000';
    y.value = '3000';
    z.value = '3000';
  }

  private drawLine_(): void {
    const r = getEl('calc-rae-r-input') as HTMLInputElement;
    const a = getEl('calc-rae-a-input') as HTMLInputElement;
    const e = getEl('calc-rae-e-input') as HTMLInputElement;

    ServiceLocator.getLineManager().createSensorToRae(this.sensorUsedInCalculation,
      { rng: Number(r.value) as Kilometers, az: Number(a.value) as Degrees, el: Number(e.value) as Degrees });
  }
}
