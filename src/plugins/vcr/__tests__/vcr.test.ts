/* eslint-disable max-lines-per-function */
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { VcrPlugin } from '@app/plugins/vcr/vcr';
import { setupStandardEnvironment } from '../../../../test/environment/standard-env';
import { standardPluginSuite } from '../../../../test/generic-tests';

describe('VcrPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);

    // Add TopMenu's nav-top-left element that VCR depends on
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="nav-top-left"></div>';
  });

  // Standard plugin lifecycle tests
  standardPluginSuite(VcrPlugin);

  describe('UI initialization', () => {
    it('should create VCR container in top menu', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const vcrContainer = getEl('vcr-container');

      expect(vcrContainer).toBeDefined();
      expect(vcrContainer).not.toBeNull();
    });

    it('should create all VCR control buttons', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      expect(getEl('vcr-rewind-btn')).not.toBeNull();
      expect(getEl('vcr-play-pause-btn')).not.toBeNull();
      expect(getEl('vcr-fast-forward-btn')).not.toBeNull();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should define keyboard shortcuts for space, left arrow, and right arrow', () => {
      const plugin = new VcrPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(3);
      expect(shortcuts[0].key).toBe(' ');
      expect(shortcuts[1].key).toBe('ArrowLeft');
      expect(shortcuts[2].key).toBe('ArrowRight');
    });

    it('should have callbacks that invoke the correct handlers', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const shortcuts = plugin.getKeyboardShortcuts();

      // Mock the handlers
      const handlePlayPauseSpy = jest.spyOn(plugin, 'handlePlayPause').mockImplementation();
      const handleRewindSpy = jest.spyOn(plugin, 'handleRewind').mockImplementation();
      const handleFastForwardSpy = jest.spyOn(plugin, 'handleFastForward').mockImplementation();

      shortcuts[0].callback();
      expect(handlePlayPauseSpy).toHaveBeenCalled();

      shortcuts[1].callback();
      expect(handleRewindSpy).toHaveBeenCalled();

      shortcuts[2].callback();
      expect(handleFastForwardSpy).toHaveBeenCalled();
    });
  });

  describe('time control verification', () => {
    it('should return true when time changing is enabled', () => {
      const plugin = new VcrPlugin();

      plugin.init();

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;

      expect(plugin.verifyTimeControl()).toBe(true);
    });

    it('should return false and show toast when time changing is disabled', () => {
      const plugin = new VcrPlugin();

      plugin.init();

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = false;

      const toastSpy = jest.spyOn(ServiceLocator.getUiManager(), 'toast');

      expect(plugin.verifyTimeControl()).toBe(false);
      expect(toastSpy).toHaveBeenCalled();
    });
  });

  describe('play/pause functionality', () => {
    it('should pause when propRate is 1', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      timeManager.propRate = 1;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handlePlayPause();

      expect(changePropRateSpy).toHaveBeenCalledWith(0);
    });

    it('should play when propRate is 0', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      timeManager.propRate = 0;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handlePlayPause();

      expect(changePropRateSpy).toHaveBeenCalledWith(1);
    });

    it('should not toggle if time control is not verified', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = false;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handlePlayPause();

      expect(changePropRateSpy).not.toHaveBeenCalled();
    });

    it('should show toast when at scenario end', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;

      const currentTime = timeManager.simulationTimeObj.getTime();

      // Set scenario end time to current simulation time
      (plugin as unknown as { scenario_: { endTime: Date } }).scenario_ = {
        endTime: new Date(currentTime),
      };

      const toastSpy = jest.spyOn(ServiceLocator.getUiManager(), 'toast');

      plugin.handlePlayPause();

      expect(toastSpy).toHaveBeenCalledWith(
        'Cannot play: Simulation time is at the end of the scenario.',
        ToastMsgType.caution,
        true,
      );
    });
  });

  describe('rewind functionality', () => {
    it('should start rewinding when not already rewinding', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isRewinding = false;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handleRewind();

      expect(plugin.isRewinding).toBe(true);
      expect(changePropRateSpy).toHaveBeenCalledWith(-plugin.forwardRewindSpeed);
    });

    it('should stop rewinding when already rewinding', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isRewinding = true;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handleRewind();

      expect(plugin.isRewinding).toBe(false);
      expect(changePropRateSpy).toHaveBeenCalledWith(1);
    });

    it('should stop fast forwarding when starting rewind', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isFastForwarding = true;
      plugin.isRewinding = false;

      plugin.handleRewind();

      expect(plugin.isFastForwarding).toBe(false);
    });
  });

  describe('fast forward functionality', () => {
    it('should start fast forwarding when not already fast forwarding', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isFastForwarding = false;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handleFastForward();

      expect(plugin.isFastForwarding).toBe(true);
      expect(changePropRateSpy).toHaveBeenCalledWith(plugin.forwardRewindSpeed);
    });

    it('should stop fast forwarding when already fast forwarding', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isFastForwarding = true;

      const changePropRateSpy = jest.spyOn(timeManager, 'changePropRate');

      plugin.handleFastForward();

      expect(plugin.isFastForwarding).toBe(false);
      expect(changePropRateSpy).toHaveBeenCalledWith(1);
    });

    it('should stop rewinding when starting fast forward', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;
      plugin.isRewinding = true;
      plugin.isFastForwarding = false;

      plugin.handleFastForward();

      expect(plugin.isRewinding).toBe(false);
    });
  });

  describe('prop rate change handling', () => {
    it('should reset state when propRate is 0', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      plugin.isFastForwarding = true;
      plugin.isRewinding = true;

      EventBus.getInstance().emit(EventBusEvent.propRateChanged, 0);

      expect(plugin.isFastForwarding).toBe(false);
      expect(plugin.isRewinding).toBe(false);
    });

    it('should reset state when propRate is 1', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      plugin.isFastForwarding = true;
      plugin.isRewinding = true;

      EventBus.getInstance().emit(EventBusEvent.propRateChanged, 1);

      expect(plugin.isFastForwarding).toBe(false);
      expect(plugin.isRewinding).toBe(false);
    });

    it('should set fast forwarding state when propRate > 1', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      EventBus.getInstance().emit(EventBusEvent.propRateChanged, 60);

      expect(plugin.isFastForwarding).toBe(true);
      expect(plugin.isRewinding).toBe(false);
    });

    it('should set rewinding state when propRate < -1', () => {
      const plugin = new VcrPlugin();

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      EventBus.getInstance().emit(EventBusEvent.propRateChanged, -60);

      expect(plugin.isRewinding).toBe(true);
      expect(plugin.isFastForwarding).toBe(false);
    });
  });

  describe('button click handlers', () => {
    it('should handle rewind button click', () => {
      const plugin = new VcrPlugin();

      // Spy before init so it captures the bound method
      const handleRewindSpy = jest.spyOn(plugin, 'handleRewind');

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;

      const rewindBtn = getEl('vcr-rewind-btn');

      rewindBtn?.click();

      expect(handleRewindSpy).toHaveBeenCalled();
    });

    it('should handle play/pause button click', () => {
      const plugin = new VcrPlugin();

      // Spy before init so it captures the bound method
      const handlePlayPauseSpy = jest.spyOn(plugin, 'handlePlayPause');

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;

      const playPauseBtn = getEl('vcr-play-pause-btn');

      playPauseBtn?.click();

      expect(handlePlayPauseSpy).toHaveBeenCalled();
    });

    it('should handle fast forward button click', () => {
      const plugin = new VcrPlugin();

      // Spy before init so it captures the bound method
      const handleFastForwardSpy = jest.spyOn(plugin, 'handleFastForward');

      plugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const timeManager = ServiceLocator.getTimeManager();

      timeManager.isTimeChangingEnabled = true;

      const fastForwardBtn = getEl('vcr-fast-forward-btn');

      fastForwardBtn?.click();

      expect(handleFastForwardSpy).toHaveBeenCalled();
    });
  });

  describe('configurable speed', () => {
    it('should use default speed when not configured', () => {
      const plugin = new VcrPlugin();

      plugin.init();

      expect(plugin.forwardRewindSpeed).toBe(60);
    });
  });
});
