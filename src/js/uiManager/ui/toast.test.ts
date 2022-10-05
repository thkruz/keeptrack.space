import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import '@app/js/settingsManager/settings';
import { toast } from './toast';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
describe('updateUrl', () => {
  // 'standby' | 'normal' | 'caution' | 'serious' | 'critical'
  it('should handle standby', () => {
    const result = () => toast('test', 'standby', false);
    expect(result).not.toThrow();
  });
  it('should handle normal', () => {
    const result = () => toast('test', 'normal', false);
    expect(result).not.toThrow();
  });
  it('should handle caution', () => {
    const result = () => toast('test', 'caution', false);
    expect(result).not.toThrow();
  });
  it('should handle serious', () => {
    const result = () => toast('test', 'serious', false);
    expect(result).not.toThrow();
  });
  it('should handle critical', () => {
    const result = () => toast('test', 'critical', false);
    expect(result).not.toThrow();
  });
  it('should handle long', () => {
    const result = () => toast('test', 'caution', true);
    expect(result).not.toThrow();
  });
});
