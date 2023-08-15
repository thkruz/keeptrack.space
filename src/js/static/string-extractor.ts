import { SpaceObjectType } from '../lib/space-object-type';
import { ControlSiteObject } from '../catalogs/control-sites';
import { countryCodeList, countryMapList, launchSiteMap } from '../catalogs/countries';
import { errorManagerInstance } from '../singletons/errorManager';

export abstract class StringExtractor {
  private static rocketUrls = [];

  /** Use this to adjust which type of objects are loaded
   * TODO: Move this somewhere else!
   */
  public static controlSiteTypeFilter(controlSite: ControlSiteObject): boolean {
    switch (controlSite.type) {
      case SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION:
      case SpaceObjectType.LAUNCH_AGENCY:
      case SpaceObjectType.SUBORBITAL_PAYLOAD_OPERATOR:
      case SpaceObjectType.PAYLOAD_OWNER:
      case SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER:
      case SpaceObjectType.LAUNCH_SITE:
      case SpaceObjectType.LAUNCH_POSITION:
        return true;
      // case 'Payload Manufacturer':
      // case 'Country':
      // case 'Astronomical Polity':
      // case 'Engine Manufacturer':
      // case 'Launch Vehicle Manufacturer':
      // case 'Parent Organization of Another Entry':
      // case 'Launch Cruise':
      // case 'Launch Zone':
      // case 'Suborbital Target Area':
      // case 'Organization Type Unknown':
      default:
        return false;
    }
  }

  public static extractCountry(countryCode: string): string {
    return countryMapList[countryCode] ?? 'Unknown';
  }

  public static extractLaunchSite(LS: string): { site: string; sitec: string } {
    if (!LS || LS == '') return { site: 'Unknown', sitec: 'Unknown' };

    const launchSite = launchSiteMap[LS];

    if (launchSite) {
      return launchSite;
    } else {
      errorManagerInstance.debug('Unknown launch site: ' + LS);
      return { site: 'Unknown', sitec: 'Unknown' };
    }
  }

  public static extractLiftVehicle(LV?: string): string {
    if (!LV || LV == 'U' || LV == 'TBD' || LV == '') {
      return 'Unknown';
    } else {
      const rocketUrl = StringExtractor.rocketUrls.filter((url) => url.rocket === LV);
      if (rocketUrl.length > 0) {
        return `<a class="iframe" href="${rocketUrl[0].url}">${LV}</a>`;
      } else {
        return 'Unknown';
      }
    }
  }

  public static getCountryCode(country?: string) {
    if (!country || country == '') return '';

    // Fix known typo in external data
    country = country === "UnitedKingdom" ? "United Kingdom" : country;
    const countryCode = countryCodeList[country];

    if (!countryCode) {
      errorManagerInstance.debug('Unknown country: ' + country);
      return '';
    } else {
      return countryCode;
    }
  }
}