import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { getEl } from '../../engine/utils/get-el';

export abstract class UiValidation {
  private static readonly allowedCodes = [
    'Delete',
    'Backspace',
    'Tab',
    'Escape',
    'NumpadEnter',
    'Enter',
    'Period',
    'NumpadDecimal',
    'Home',
    'End',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
  ];

  private static readonly numberCodes = [
    'Numpad1',
    'Numpad2',
    'Numpad3',
    'Numpad4',
    'Numpad5',
    'Numpad6',
    'Numpad7',
    'Numpad8',
    'Numpad9',
    'Numpad0',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5',
    'Digit6',
    'Digit7',
    'Digit8',
    'Digit9',
    'Digit0',
  ];

  static initUiValidation() {
    /*
     * Note: Depending on which plugins on enabled, some or all of
     * the following event listeners may be added.
     */
    getEl('editSat', true)
      ?.querySelectorAll('input')
      .forEach((el: HTMLInputElement) => {
        if (el.id === `${EditSat.elementPrefix}-country`) {
          return;
        }
        el.addEventListener('keydown', UiValidation.validateNumOnly_);
      });
    getEl(`${EditSat.elementPrefix}-ecen`, true)?.addEventListener('keydown', UiValidation.allowPeriod_);
    getEl(`${EditSat.elementPrefix}-day`, true)?.addEventListener('keyup', UiValidation.esDay366_);
    getEl(`${EditSat.elementPrefix}-inc`, true)?.addEventListener('keyup', UiValidation.esInc180_);
    getEl(`${EditSat.elementPrefix}-rasc`, true)?.addEventListener('keyup', UiValidation.esRasc360_);
    getEl(`${EditSat.elementPrefix}-meanmo`, true)?.addEventListener('keyup', UiValidation.esMeanmo18_);
    getEl(`${EditSat.elementPrefix}-argPe`, true)?.addEventListener('keyup', UiValidation.esArgPe360_);
    getEl(`${EditSat.elementPrefix}-meana`, true)?.addEventListener('keyup', UiValidation.esMeana360_);
    getEl('ms-lat', true)?.addEventListener('keyup', UiValidation.msLat90_);
    getEl('ms-lon', true)?.addEventListener('keyup', UiValidation.msLon180_);
  }

  private static allowPeriod_(e: KeyboardEvent) {
    if (e.code === 'Period' || e.code === 'NumpadDecimal') {
      e.preventDefault();
    }
  }

  private static esArgPe360_(): void {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = '000.0000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value) > 360) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-argPe`)).value = '360.0000';
    }
  }

  private static esDay366_() {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = '000.00000000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value) >= 367) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-day`)).value = '366.00000000';
    }
  }

  private static esInc180_(): void {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = '000.0000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value) > 180) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-inc`)).value = '180.0000';
    }
  }

  private static esMeana360_(): void {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = '000.0000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value) > 360) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meana`)).value = '360.0000';
    }
  }

  private static esMeanmo18_(): void {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = '00.00000000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value) > 18) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-meanmo`)).value = '18.00000000';
    }
  }

  private static esRasc360_(): void {
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value) < 0) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = '000.0000';
    }
    if (parseInt((<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value) > 360) {
      (<HTMLInputElement>getEl(`${EditSat.elementPrefix}-rasc`)).value = '360.0000';
    }
  }

  private static msLat90_(): void {
    if (parseInt((<HTMLInputElement>getEl('ms-lat')).value) < -90) {
      (<HTMLInputElement>getEl('ms-lat')).value = '-90.000';
    }
    if (parseInt((<HTMLInputElement>getEl('ms-lat')).value) > 90) {
      (<HTMLInputElement>getEl('ms-lat')).value = '90.000';
    }
  }

  private static msLon180_(): void {
    if (parseInt((<HTMLInputElement>getEl('ms-lon')).value) < -180) {
      (<HTMLInputElement>getEl('ms-lon')).value = '-180.000';
    }
    if (parseInt((<HTMLInputElement>getEl('ms-lon')).value) > 180) {
      (<HTMLInputElement>getEl('ms-lon')).value = '180.000';
    }
  }

  private static validateNumOnly_(e: KeyboardEvent) {
    /*
     * Allow: Ctrl+A, Command+A
     * Allow: backspace, delete, tab, escape, enter and .
     * Allow: home, end, left, right, down, up
     */
    if ((e.code === 'KeyA' && (e.ctrlKey === true || e.metaKey === true)) || UiValidation.allowedCodes.includes(e.code)) {
      // let it happen, don't do anything
      return;
    }
    // Ensure that it is a number and stop the keypress
    if (!UiValidation.numberCodes.includes(e.code)) {
      e.preventDefault();
    }
  }
}
