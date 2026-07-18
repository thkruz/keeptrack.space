import { syncFormFields, validateDateInput } from '@app/plugins/scenario-management/scenario-form-utils';
import { ScenarioData } from '@app/plugins/scenario-management/scenario-management';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('scenario-form-utils', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '';
  });

  describe('validateDateInput', () => {
    const makeInput = (value: string): HTMLInputElement => {
      const input = document.createElement('input');

      input.value = value;

      return input;
    };

    it('accepts a well-formed date and marks the input valid', () => {
      const input = makeInput('2022-01-01 00:00:00');

      expect(validateDateInput(input)).toBe(true);
      expect(input.classList.contains('valid')).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    it('accepts an optional millisecond fraction', () => {
      expect(validateDateInput(makeInput('2022-01-01 12:34:56.789'))).toBe(true);
    });

    it('rejects a malformed date and marks the input invalid', () => {
      const input = makeInput('01/01/2022');

      expect(validateDateInput(input)).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
      expect(input.classList.contains('valid')).toBe(false);
    });

    it('flips classes when a previously-valid input becomes invalid', () => {
      const input = makeInput('2022-01-01 00:00:00');

      validateDateInput(input);
      input.value = 'nonsense';
      validateDateInput(input);

      expect(input.classList.contains('valid')).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
    });
  });

  describe('syncFormFields', () => {
    const addInput = (id: string): HTMLInputElement => {
      const input = document.createElement('input');

      input.id = id;
      document.body.appendChild(input);

      return input;
    };

    const scenario: ScenarioData = {
      name: 'My Scenario',
      description: 'A test scenario',
      startTime: new Date(Date.UTC(2022, 0, 1, 6, 0, 0)),
      endTime: new Date(Date.UTC(2022, 0, 2, 12, 30, 0)),
    };

    it('populates all present form fields from the scenario', () => {
      const nameEl = addInput('sc-name');
      const descEl = addInput('sc-description');
      const startEl = addInput('sc-start-date');
      const endEl = addInput('sc-end-date');

      syncFormFields('sc', scenario);

      expect(nameEl.value).toBe('My Scenario');
      expect(descEl.value).toBe('A test scenario');
      expect(startEl.value).toBe('2022-01-01 06:00:00.000');
      expect(endEl.value).toBe('2022-01-02 12:30:00.000');
    });

    it('writes empty strings for null start/end times', () => {
      const startEl = addInput('sc-start-date');
      const endEl = addInput('sc-end-date');

      syncFormFields('sc', { ...scenario, startTime: null, endTime: null });

      expect(startEl.value).toBe('');
      expect(endEl.value).toBe('');
    });

    it('tolerates missing DOM elements without throwing', () => {
      expect(() => syncFormFields('does-not-exist', scenario)).not.toThrow();
    });
  });
});
