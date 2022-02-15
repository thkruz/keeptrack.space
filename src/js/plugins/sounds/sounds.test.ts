import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as sounds from './sounds';
import { init } from './sounds';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('sounds.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      sounds.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sounds', () => {
  beforeEach(() => {
    init();
    keepTrackApi.methods.uiManagerInit();
  });

  it('should load voices', () => {
    window.speechSynthesis = {
      getVoices: () => [{ voiceURI: 'voice1' }] as any,
    } as any;
    keepTrackApi.programs.soundManager.loadVoices();
  });

  it('should speak', () => {
    window.SpeechSynthesisUtterance = jest.fn();
    window.speechSynthesis = {
      getVoices: () => ({ filter: (cb) => cb({ name: 'Google UK English Female' }) } as any),
      speak: jest.fn(),
    } as any;
    keepTrackApi.programs.soundManager.speak('Hello');
  });

  it('should play sounds', () => {
    keepTrackApi.programs.soundManager.play('standby');
  });
});
