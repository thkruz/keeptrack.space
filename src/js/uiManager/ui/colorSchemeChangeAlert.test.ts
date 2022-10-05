import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { ColorRuleSet } from '@app/js/colorManager/colorSchemeManager';
import { setColorScheme } from '@app/js/satSet/satSet';
import '@app/js/settingsManager/settings';
import { colorSchemeChangeAlert } from './colorSchemeChangeAlert';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
describe('colorSchemeChangeAlert', () => {
  // 'standby' | 'normal' | 'caution' | 'serious' | 'critical'
  it('should handle group', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.group, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.group);
    expect(result).not.toThrow();
  });
  it('should handle velocity', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.velocity, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.velocity);
    expect(result).not.toThrow();
  });
  it('should handle default', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.default, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.default);
    expect(result).not.toThrow();
  });
  it('should handle sunlight', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.sunlight, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.sunlight);
    expect(result).not.toThrow();
  });
  it('should handle countries', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.countries, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.countries);
    expect(result).not.toThrow();
  });
  it('should handle groupCountries', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.groupCountries, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.groupCountries);
    expect(result).not.toThrow();
  });
  it('should handle leo', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.leo, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.leo);
    expect(result).not.toThrow();
  });
  it('should handle geo', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.geo, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.geo);
    expect(result).not.toThrow();
  });
  it('should handle ageOfElset', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.ageOfElset, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.ageOfElset);
    expect(result).not.toThrow();
  });
  it('should handle rcs', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.rcs, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.rcs);
    expect(result).not.toThrow();
  });
  it('should handle smallsats', () => {
    setColorScheme(keepTrackApi.programs.colorSchemeManager.smallsats, true);
    const result = () => colorSchemeChangeAlert(keepTrackApi.programs.colorSchemeManager.smallsats);
    expect(result).not.toThrow();
  });
  it('should handle unknown', () => {
    const result = () => colorSchemeChangeAlert(null);
    expect(result).not.toThrow();
  });
  it('should handle fake', () => {
    const fakeColorScheme = () => ({ color: [0, 0, 0, 0] });
    const result = () => colorSchemeChangeAlert(<ColorRuleSet>(<unknown>fakeColorScheme));
    expect(result).not.toThrow();
  });
});
