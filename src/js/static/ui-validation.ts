import { getEl } from '../lib/get-el';

export abstract class UiValidation {
    private static allowedCodes = [
        'Delete',
        'Backspace',
        'Tab',
        'Escape',
        'NumpadEnter',
        'Enter',
        'NumpadEnter',
        'Period',
        'Home',
        'End',
        'ArrowLeft',
        'ArrowUp',
        'ArrowRight',
        'ArrowDown',
    ];

    private static numberCodes = [
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
        // Note: Depending on which plugins on enabled, some or all of
        // the following event listeners may be added.
        getEl('editSat')
            ?.querySelectorAll('input')
            .forEach((el: HTMLInputElement) => {
                el.addEventListener('keydown', UiValidation.validateNumOnly_);
            });
        getEl('es-ecen')?.addEventListener('keydown', UiValidation.allowPeriod_);
        getEl('es-day')?.addEventListener('keyup', UiValidation.esDay366_);
        getEl('es-inc')?.addEventListener('keyup', UiValidation.esInc180_);
        getEl('es-rasc')?.addEventListener('keyup', UiValidation.esRasc360_);
        getEl('es-meanmo')?.addEventListener('keyup', UiValidation.esMeanmo18_);
        getEl('es-argPe')?.addEventListener('keyup', UiValidation.esArgPe360_);
        getEl('es-meana')?.addEventListener('keyup', UiValidation.esMeana360_);
        getEl('ms-lat')?.addEventListener('keyup', UiValidation.msLat90_);
        getEl('ms-lon')?.addEventListener('keyup', UiValidation.msLon180_);
    }

    private static allowPeriod_(e: KeyboardEvent) {
        if (e.code === 'Period' || e.code === 'NumpadDecimal') e.preventDefault();
    }

    private static esArgPe360_(): void {
        if (parseInt((<HTMLInputElement>getEl('es-argPe')).value) < 0) (<HTMLInputElement>getEl('es-argPe')).value = '000.0000';
        if (parseInt((<HTMLInputElement>getEl('es-argPe')).value) > 360) (<HTMLInputElement>getEl('es-argPe')).value = '360.0000';
    }

    private static esDay366_() {
        if (parseInt((<HTMLInputElement>getEl('es-day')).value) < 0) (<HTMLInputElement>getEl('es-day')).value = '000.00000000';
        if (parseInt((<HTMLInputElement>getEl('es-day')).value) >= 367) (<HTMLInputElement>getEl('es-day')).value = '366.00000000';
    }

    private static esInc180_(): void {
        if (parseInt((<HTMLInputElement>getEl('es-inc')).value) < 0) (<HTMLInputElement>getEl('es-inc')).value = '000.0000';
        if (parseInt((<HTMLInputElement>getEl('es-inc')).value) > 180) (<HTMLInputElement>getEl('es-inc')).value = '180.0000';
    }

    private static esMeana360_(): void {
        if (parseInt((<HTMLInputElement>getEl('es-meana')).value) < 0) (<HTMLInputElement>getEl('es-meana')).value = '000.0000';
        if (parseInt((<HTMLInputElement>getEl('es-meana')).value) > 360) (<HTMLInputElement>getEl('es-meana')).value = '360.0000';
    }

    private static esMeanmo18_(): void {
        if (parseInt((<HTMLInputElement>getEl('es-meanmo')).value) < 0) (<HTMLInputElement>getEl('es-meanmo')).value = '00.00000000';
        if (parseInt((<HTMLInputElement>getEl('es-meanmo')).value) > 18) (<HTMLInputElement>getEl('es-meanmo')).value = '18.00000000';
    }

    private static esRasc360_(): void {
        if (parseInt((<HTMLInputElement>getEl('es-rasc')).value) < 0) (<HTMLInputElement>getEl('es-rasc')).value = '000.0000';
        if (parseInt((<HTMLInputElement>getEl('es-rasc')).value) > 360) (<HTMLInputElement>getEl('es-rasc')).value = '360.0000';
    }

    private static msLat90_(): void {
        if (parseInt((<HTMLInputElement>getEl('ms-lat')).value) < -90) (<HTMLInputElement>getEl('ms-lat')).value = '-90.000';
        if (parseInt((<HTMLInputElement>getEl('ms-lat')).value) > 90) (<HTMLInputElement>getEl('ms-lat')).value = '90.000';
    }

    private static msLon180_(): void {
        if (parseInt((<HTMLInputElement>getEl('ms-lon')).value) < -180) (<HTMLInputElement>getEl('ms-lon')).value = '-180.000';
        if (parseInt((<HTMLInputElement>getEl('ms-lon')).value) > 180) (<HTMLInputElement>getEl('ms-lon')).value = '180.000';
    }

    private static validateNumOnly_(e: KeyboardEvent) {
        // Allow: Ctrl+A, Command+A
        // Allow: backspace, delete, tab, escape, enter and .
        // Allow: home, end, left, right, down, up
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
