/* eslint-disable no-undefined */
/*globals
  global
  test
  expect
  describe
*/

import { objectManager } from '@app/js/objectManager/objectManager.js';

describe('ObjectManager Unit Tests', () => {
  test('ObjectManager Basic Functions', () => {
    objectManager.setSelectedSat(123);
    expect(objectManager.selectedSat).toBe(123);
    expect(window.selectedSat).toBe(123);

    objectManager.setHoveringSat(123);
    expect(objectManager.hoveringSat).toBe(123);

    objectManager.setLasthoveringSat(123);
    expect(objectManager.lasthoveringSat).toBe(123);

    objectManager.setMissileManagerLoaded(true);
    expect(objectManager.isMissileManagerLoaded).toBe(true);

    objectManager.lastSelectedSat(2);
    expect(objectManager.lastSelectedSat()).toBe(2);
  });

  test('ObjectManager Init', () => {
    objectManager.init();
    global.settingsManager = {};
    objectManager.init();
    global.settingsManager.maxMissiles = 1;
    objectManager.init();
    global.settingsManager.maxRadarData = 1;
    objectManager.init();
    global.settingsManager.maxAnalystSats = 1;
    objectManager.init();
    global.settingsManager.lowPerf = true;
    objectManager.init();
    global.settingsManager.lowPerf = false;
    global.settingsManager.noStars = true;
    objectManager.init();
    let sensorManager = {
      sensorList: [
        {
          staticNum: 1,
          name: 'test',
          type: 1,
          lat: 1,
          lon: 1,
          alt: 1,
          changeObjectInterval: 1,
        },
      ],
    };
    global.settingsManager.noStars = false;
    objectManager.init(sensorManager);

    global.settingsManager.maxFieldOfViewMarkers = undefined;
    objectManager.init(sensorManager);
  });

  test('ObjectManager extractCountry', () => {
    expect(objectManager.extractCountry('U')).toBe('Unknown');
    expect(objectManager.extractCountry('ANALSAT')).toBe('Analyst Satellite');
    expect(objectManager.extractCountry('AB')).toBe('Saudi Arabia');
    expect(objectManager.extractCountry('AC')).toBe('AsiaSat Corp');
    expect(objectManager.extractCountry('ALG')).toBe('Algeria');
    expect(objectManager.extractCountry('ALL')).toBe('All');
    expect(objectManager.extractCountry('ARGN')).toBe('Argentina');
    expect(objectManager.extractCountry('ASRA')).toBe('Austria');
    expect(objectManager.extractCountry('AUS')).toBe('Australia');
    expect(objectManager.extractCountry('AZER')).toBe('Azerbaijan');
    expect(objectManager.extractCountry('BEL')).toBe('Belgium');
    expect(objectManager.extractCountry('BELA')).toBe('Belarus');
    expect(objectManager.extractCountry('BERM')).toBe('Bermuda');
    expect(objectManager.extractCountry('BOL')).toBe('Bolivia');
    expect(objectManager.extractCountry('BRAZ')).toBe('Brazil');
    expect(objectManager.extractCountry('CA')).toBe('Canada');
    expect(objectManager.extractCountry('CHBZ')).toBe('China/Brazil');
    expect(objectManager.extractCountry('CHLE')).toBe('Chile');
    expect(objectManager.extractCountry('CIS')).toBe('Commonwealth of Ind States');
    expect(objectManager.extractCountry('COL')).toBe('Colombia');
    expect(objectManager.extractCountry('CZCH')).toBe('Czechoslovakia');
    expect(objectManager.extractCountry('DEN')).toBe('Denmark');
    expect(objectManager.extractCountry('ECU')).toBe('Ecuador');
    expect(objectManager.extractCountry('EGYP')).toBe('Egypt');
    expect(objectManager.extractCountry('ESA')).toBe('European Space Agency');
    expect(objectManager.extractCountry('EST')).toBe('Estonia');
    expect(objectManager.extractCountry('EUME')).toBe('EUMETSAT');
    expect(objectManager.extractCountry('EUTE')).toBe('EUTELSAT');
    expect(objectManager.extractCountry('FGER')).toBe('France/Germany');
    expect(objectManager.extractCountry('FR')).toBe('France');
    expect(objectManager.extractCountry('FRIT')).toBe('France/Italy');
    expect(objectManager.extractCountry('GER')).toBe('Germany');
    expect(objectManager.extractCountry('GLOB')).toBe('United States');
    expect(objectManager.extractCountry('GREC')).toBe('Greece');
    expect(objectManager.extractCountry('HUN')).toBe('Hungary');
    expect(objectManager.extractCountry('IM')).toBe('United Kingdom');
    expect(objectManager.extractCountry('IND')).toBe('India');
    expect(objectManager.extractCountry('INDO')).toBe('Indonesia');
    expect(objectManager.extractCountry('IRAN')).toBe('Iran');
    expect(objectManager.extractCountry('IRAQ')).toBe('Iraq');
    expect(objectManager.extractCountry('ISRA')).toBe('Israel');
    expect(objectManager.extractCountry('ISS')).toBe('International');
    expect(objectManager.extractCountry('IT')).toBe('Italy');
    expect(objectManager.extractCountry('ITSO')).toBe('Luxembourg');
    expect(objectManager.extractCountry('JPN')).toBe('Japan');
    expect(objectManager.extractCountry('KAZ')).toBe('Kazakhstan');
    expect(objectManager.extractCountry('LAOS')).toBe('Laos');
    expect(objectManager.extractCountry('LTU')).toBe('Lithuania');
    expect(objectManager.extractCountry('LUXE')).toBe('Luxembourg');
    expect(objectManager.extractCountry('MALA')).toBe('Malaysia');
    expect(objectManager.extractCountry('MEX')).toBe('Mexico');
    expect(objectManager.extractCountry('NATO')).toBe('North Atlantic Treaty Org');
    expect(objectManager.extractCountry('MEX')).toBe('Mexico');
    expect(objectManager.extractCountry('NETH')).toBe('Netherlands');
    expect(objectManager.extractCountry('NICO')).toBe('United States');
    expect(objectManager.extractCountry('NIG')).toBe('Nigeria');
    expect(objectManager.extractCountry('NKOR')).toBe('North Korea');
    expect(objectManager.extractCountry('NOR')).toBe('Norway');
    expect(objectManager.extractCountry('O3B')).toBe('Luxembourg');
    expect(objectManager.extractCountry('ORB')).toBe('United States');
    expect(objectManager.extractCountry('PAKI')).toBe('Pakistan');
    expect(objectManager.extractCountry('PERU')).toBe('Peru');
    expect(objectManager.extractCountry('POL')).toBe('Poland');
    expect(objectManager.extractCountry('POR')).toBe('Portugal');
    expect(objectManager.extractCountry('PRC')).toBe('China');
    expect(objectManager.extractCountry('RASC')).toBe('Mauritius');
    expect(objectManager.extractCountry('ROC')).toBe('Taiwan');
    expect(objectManager.extractCountry('ROM')).toBe('Romania');
    expect(objectManager.extractCountry('RP')).toBe('Philippines');
    expect(objectManager.extractCountry('SAFR')).toBe('South Africa');
    expect(objectManager.extractCountry('SAUD')).toBe('Saudi Arabia');
    expect(objectManager.extractCountry('SEAL')).toBe('Russia');
    expect(objectManager.extractCountry('RP')).toBe('Philippines');
    expect(objectManager.extractCountry('SES')).toBe('Luxembourg');
    expect(objectManager.extractCountry('SING')).toBe('Singapore');
    expect(objectManager.extractCountry('SKOR')).toBe('South Korea');
    expect(objectManager.extractCountry('SPN')).toBe('Spain');
    expect(objectManager.extractCountry('STCT')).toBe('Singapore/Taiwan');
    expect(objectManager.extractCountry('SWED')).toBe('Sweden');
    expect(objectManager.extractCountry('SWTZ')).toBe('Switzerland');
    expect(objectManager.extractCountry('THAI')).toBe('Thailand');
    expect(objectManager.extractCountry('TMMC')).toBe('Turkmenistan/Monaco');
    expect(objectManager.extractCountry('TURK')).toBe('Turkey');
    expect(objectManager.extractCountry('UAE')).toBe('United Arab Emirates');
    expect(objectManager.extractCountry('UK')).toBe('United Kingdom');
    expect(objectManager.extractCountry('UKR')).toBe('Ukraine');
    expect(objectManager.extractCountry('URY')).toBe('Uruguay');
    expect(objectManager.extractCountry('US')).toBe('United States');
    expect(objectManager.extractCountry('USBZ')).toBe('United States/Brazil');
    expect(objectManager.extractCountry('VENZ')).toBe('Venezuela');
    expect(objectManager.extractCountry('VTNM')).toBe('Vietnam');
  });

  test('ObjectManager extractLiftVehicle', () => {
    objectManager.extractLiftVehicle('U');
    objectManager.extractLiftVehicle('Angara A5');
    objectManager.extractLiftVehicle('A');
  });

  test('ObjectManager extractLaunchSite', () => {
    expect(objectManager.extractLaunchSite('U')).toStrictEqual({
      site: 'Unknown',
      sitec: 'Unknown',
    });
    expect(objectManager.extractLaunchSite('Unknown')).toStrictEqual({
      site: 'Unknown',
      sitec: 'Unknown',
    });
    expect(objectManager.extractLaunchSite('ANALSAT')).toStrictEqual({
      site: 'Analyst Satellite',
      sitec: 'Analyst Satellite',
    });
    expect(objectManager.extractLaunchSite('AFETR')).toStrictEqual({
      site: 'Cape Canaveral SFS',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('AFWTR')).toStrictEqual({
      site: 'Vandenberg AFB',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('CAS')).toStrictEqual({
      site: 'Canary Islands',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('FRGUI')).toStrictEqual({
      site: 'French Guiana',
      sitec: 'French Guiana',
    });
    expect(objectManager.extractLaunchSite('HGSTR')).toStrictEqual({
      site: 'Hammaguira STR',
      sitec: 'Algeria',
    });
    expect(objectManager.extractLaunchSite('KSCUT')).toStrictEqual({
      site: 'Uchinoura Space Center',
      sitec: 'Japan',
    });
    expect(objectManager.extractLaunchSite('KYMTR')).toStrictEqual({
      site: 'Kapustin Yar MSC',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('PKMTR')).toStrictEqual({
      site: 'Plesetsk MSC',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('WSC')).toStrictEqual({
      site: 'Wenchang SLC',
      sitec: 'China',
    });
    expect(objectManager.extractLaunchSite('SNMLP')).toStrictEqual({
      site: 'San Marco LP',
      sitec: 'Kenya',
    });
    expect(objectManager.extractLaunchSite('SRI')).toStrictEqual({
      site: 'Satish Dhawan SC',
      sitec: 'India',
    });
    expect(objectManager.extractLaunchSite('TNSTA')).toStrictEqual({
      site: 'Tanegashima SC',
      sitec: 'Japan',
    });
    expect(objectManager.extractLaunchSite('TTMTR')).toStrictEqual({
      site: 'Baikonur Cosmodrome',
      sitec: 'Kazakhstan',
    });
    expect(objectManager.extractLaunchSite('WLPIS')).toStrictEqual({
      site: 'Wallops Island',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('WOMRA')).toStrictEqual({
      site: 'Woomera',
      sitec: 'Australia',
    });
    expect(objectManager.extractLaunchSite('VOSTO')).toStrictEqual({
      site: 'Vostochny Cosmodrome',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('PMRF')).toStrictEqual({
      site: 'PMRF Barking Sands',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('SEAL')).toStrictEqual({
      site: 'Sea Launch Odyssey',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('KWAJ')).toStrictEqual({
      site: 'Kwajalein',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('ERAS')).toStrictEqual({
      site: 'Pegasus East',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('JSC')).toStrictEqual({
      site: 'Jiuquan SLC',
      sitec: 'China',
    });
    expect(objectManager.extractLaunchSite('SVOB')).toStrictEqual({
      site: 'Svobodny',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('TSC')).toStrictEqual({
      site: 'Taiyaun SC',
      sitec: 'China',
    });
    expect(objectManager.extractLaunchSite('WRAS')).toStrictEqual({
      site: 'Pegasus West',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('XSC')).toStrictEqual({
      site: 'Xichang SC',
      sitec: 'China',
    });
    expect(objectManager.extractLaunchSite('YAVNE')).toStrictEqual({
      site: 'Yavne',
      sitec: 'Israel',
    });
    expect(objectManager.extractLaunchSite('OREN')).toStrictEqual({
      site: 'Orenburg',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('SADOL')).toStrictEqual({
      site: 'Submarine Launch',
      sitec: 'Russia',
    });
    expect(objectManager.extractLaunchSite('KODAK')).toStrictEqual({
      site: 'Kodiak Island',
      sitec: 'United States',
    });
    expect(objectManager.extractLaunchSite('SEM')).toStrictEqual({
      site: 'Semnan',
      sitec: 'Iran',
    });
    expect(objectManager.extractLaunchSite('YUN')).toStrictEqual({
      site: 'Sohae SLS',
      sitec: 'North Korea',
    });
    expect(objectManager.extractLaunchSite('TNGH')).toStrictEqual({
      site: 'Tonghae SLG',
      sitec: 'North Korea',
    });
    expect(objectManager.extractLaunchSite('NSC')).toStrictEqual({
      site: 'Naro Space Center',
      sitec: 'South Korea',
    });
    expect(objectManager.extractLaunchSite('RLLC')).toStrictEqual({
      site: 'Rocket Labs LC',
      sitec: 'New Zealand',
    });

    expect(objectManager.extractLaunchSite('AMH')).toStrictEqual({
      site: "A' Mhòine",
      sitec: 'Scotland',
    });
    expect(objectManager.extractLaunchSite('ALC')).toStrictEqual({
      site: 'Alcântara Launch Center',
      sitec: 'Brazil',
    });

    expect(objectManager.extractLaunchSite('FAKE')).toStrictEqual({
      site: undefined,
      sitec: undefined,
    });
  });
});
