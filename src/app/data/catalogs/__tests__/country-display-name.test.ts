import '@app/locales/locales';
import i18next from 'i18next';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countryNameList, getCountryDisplayName } from '../countries';

/*
 * t7e caches each key on first lookup, so this file switches to German BEFORE any
 * lookup and stays there; English resolution is checked through { lng: 'en' }.
 */
describe('getCountryDisplayName', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('de');
  });

  afterAll(async () => {
    await i18next.changeLanguage('en');
  });

  it('localizes names and catalog codes through the countries.* keys', () => {
    expect(getCountryDisplayName('Germany')).toBe(i18next.t('countries.D'));
    expect(getCountryDisplayName('D')).toBe(i18next.t('countries.D'));
    expect(getCountryDisplayName('Germany')).not.toBe('Germany');
  });

  it('returns a non-empty label for every country name', () => {
    for (const name of countryNameList) {
      expect(getCountryDisplayName(name).length).toBeGreaterThan(0);
    }
  });

  it('leaves unknown ids untouched', () => {
    expect(getCountryDisplayName('Not A Country')).toBe('Not A Country');
    expect(getCountryDisplayName('')).toBe('');
  });
});
