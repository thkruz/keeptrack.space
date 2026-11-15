import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';

describe('CustomSensorPlugin R18 layout (#215)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    websiteInit(new CustomSensorPlugin());
  });

  it('gives latitude and longitude example placeholders', () => {
    expect((document.getElementById('cs-lat') as HTMLInputElement).placeholder).not.toBe('');
    expect((document.getElementById('cs-lon') as HTMLInputElement).placeholder).not.toBe('');
  });

  it('explains the Telescope switch under it', () => {
    const hint = document.getElementById('cs-telescope-hint')!;
    const sw = document.getElementById('cs-telescope')!.closest('.switch')!;

    expect(hint.classList.contains('kt-hint')).toBe(true);
    expect(sw.nextElementSibling).toBe(hint);
  });
});
