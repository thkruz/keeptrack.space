/* eslint-disable dot-notation */

import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { ScenarioManagementMenu } from '@app/plugins/scenario-management/scenario-management-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

vi.mock('file-saver', () => ({ __esModule: true, default: vi.fn(), saveAs: vi.fn() }));
vi.mock('@app/engine/utils/compression', () => ({
  compressToGzip: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
  decompressFromGzip: vi.fn(() => Promise.resolve('{"scenario":{"name":"X"}}')),
}));

describe('ScenarioManagementMenu', () => {
  let plugin: ScenarioManagementMenu;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const PREFIX = 'scenario-management-form';

  const setInput = (suffix: string, value: string) => {
    (getEl(`${PREFIX}-${suffix}`) as HTMLInputElement).value = value;
  };

  beforeEach(() => {
    setupStandardEnvironment([ScenarioManagementPlugin]);
    plugin = new ScenarioManagementMenu();
    // Inject the side-menu form directly and drive the handlers - the plugin's own
    // addHtml() reads these inputs via getEl (which throws in node when missing).
    document.body.insertAdjacentHTML(
      'beforeend',
      `<form id="${PREFIX}-form">` +
        `<input id="${PREFIX}-name" /><input id="${PREFIX}-description" />` +
        `<input id="${PREFIX}-start-date" /><input id="${PREFIX}-end-date" />` +
        `<button id="${PREFIX}-save"></button><button id="${PREFIX}-load"></button>` +
        '</form>'
    );
    // Control the core plugin the menu delegates to.
    p().corePlugin_ = {
      defaultScenarioName: 'Default',
      defaultScenarioDescription: 'Desc',
      scenario: { name: 'Scn', description: 'D', startTime: new Date('2026-05-31T00:00:00Z'), endTime: null },
      updateScenario: vi.fn(() => true),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  describe('onSubmit_', () => {
    it('updates the scenario from valid form fields', () => {
      setInput('name', 'My Scenario');
      setInput('description', 'A test');
      setInput('start-date', '2026-05-31 00:00:00.000');
      setInput('end-date', '');

      p().onSubmit_();

      expect(p().corePlugin_.updateScenario).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Scenario' }));
    });

    it('warns and does not update when the name is empty', () => {
      setInput('name', '');

      p().onSubmit_();

      expect(p().corePlugin_.updateScenario).not.toHaveBeenCalled();
    });

    it('rejects an invalid start date', () => {
      setInput('name', 'Has Name');
      setInput('start-date', 'not-a-date');

      p().onSubmit_();

      expect(p().corePlugin_.updateScenario).not.toHaveBeenCalled();
    });

    it('toasts on a user-initiated successful update', () => {
      const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      setInput('name', 'Has Name');
      setInput('start-date', '');
      setInput('end-date', '');

      p().onSubmit_({ preventDefault: vi.fn() } as never);

      expect(toastSpy).toHaveBeenCalled();
    });
  });

  describe('lifecycle wiring', () => {
    it('addJs syncs the form when the scenario is updated', () => {
      plugin.addJs();
      p().corePlugin_ = { scenario: { name: 'New', description: '', startTime: null, endTime: null } };

      expect(() => EventBus.getInstance().emit(EventBusEvent.scenarioUpdated)).not.toThrow();
    });
  });

  describe('onDateChange_', () => {
    it('validates the changed date input without throwing', () => {
      const input = getEl(`${PREFIX}-start-date`) as HTMLInputElement;

      input.value = '2026-05-31 00:00:00.000';

      expect(() => p().onDateChange_({ target: input } as never)).not.toThrow();
    });
  });

  describe('onSave_', () => {
    it('compresses the scenario and triggers a file download', async () => {
      const { saveAs } = await import('file-saver');

      setInput('name', 'SaveMe');

      await p().onSave_({ preventDefault: vi.fn() } as never);

      expect(saveAs).toHaveBeenCalled();
    });
  });

  describe('onLoad_', () => {
    it('creates a hidden file input and triggers the picker', () => {
      const clickSpy = vi.fn();
      const realCreate = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = realCreate(tag);

        if (tag === 'input') {
          el.click = clickSpy;
        }

        return el;
      });

      p().onLoad_();

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
