import { t7e } from '@app/locales/keys';
import { BaseObject, SpaceObjectType } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { countryCodeList, getCountryMapList, launchSiteMap } from '../data/catalogs/countries';
import { manufacturerCodeMap } from '../data/catalogs/manufacturer-codes';
import { orgDataService } from '../data/catalogs/org-data-service';
import { ownerCodeMap } from '../data/catalogs/owner-codes';
import { rocketUrls } from '../data/catalogs/rocket-urls';
import { userUrls } from '../data/catalogs/user-urls';

export abstract class StringExtractor {
  /**
   * Use this to adjust which type of objects are loaded
   * TODO: Move this somewhere else!
   */
  static controlSiteTypeFilter(controlSite: BaseObject): boolean {
    switch (controlSite.type) {
      case SpaceObjectType.LAUNCH_SITE:
      case SpaceObjectType.LAUNCH_POSITION:
        return true;
      /*
       * Agency/operator types (LAUNCH_AGENCY, PAYLOAD_OWNER,
       * INTERGOVERNMENTAL_ORGANIZATION, SUBORBITAL_PAYLOAD_OPERATOR,
       * METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER, etc.) are
       * intentionally NOT loaded. Drawing agencies on the globe is no longer
       * supported (their locations rarely link cleanly to satellites). The
       * underlying data in control-sites.ts is retained for future use.
       */
      default:
        return false;
    }
  }

  static extractCountry(countryCode: string): string {
    return getCountryMapList()[countryCode] ?? t7e('countries.TBD');
  }

  static extractLaunchSite(LS: string): { site: string; country: string; wikiUrl: string | null } {
    if (!LS || LS === '') {
      return { site: t7e('Common.unknown'), country: t7e('Common.unknown'), wikiUrl: null };
    }

    const launchSite = launchSiteMap[LS];

    if (launchSite) {
      return launchSite;
    }
    errorManagerInstance.debug(`Unknown launch site: ${LS}`);

    return { site: t7e('Common.unknown'), country: t7e('Common.unknown'), wikiUrl: null };
  }

  static extractLiftVehicle(LV?: string): string {
    if (!LV || LV === 'U' || LV === 'TBD' || LV === '') {
      return t7e('Common.unknown');
    }
    const rocketUrl = rocketUrls.filter((url) => url.rocket === LV);

    if (rocketUrl.length > 0) {
      return `<a class="iframe" href="${rocketUrl[0].url}">${LV}</a>`;
    }

    return `${LV}`;
  }

  static extractUserUrl(user: string, displayName?: string): string {
    if (!user || user === '') {
      return t7e('Common.unknown');
    }

    const label = displayName ?? user;
    const userUrl = userUrls.find((url) => url.user === user);

    if (userUrl?.url) {
      return `<a href="${userUrl.url}" target="_blank">${label}</a>`;
    }

    return label;
  }

  /**
   * Expands a GCAT owner/operator OrgCode to its full organization name.
   * Handles composite codes with "/" separator (e.g., "GSFC/NOAA").
   * Returns the raw code if no mapping is found (preserves info).
   */
  static extractOwner(ownerCode: string): string {
    if (!ownerCode || ownerCode === '') {
      return t7e('Common.unknown');
    }

    // Enhanced Catalog already has full names
    if (ownerCode.length > 12) {
      return ownerCode;
    }

    // Try R2 org data first, fall back to bundled static map
    const direct = orgDataService.resolveCode(ownerCode, ownerCodeMap);

    if (direct) {
      return direct;
    }

    // Split composite codes and look up each part
    if (ownerCode.includes('/')) {
      const parts = ownerCode.split('/');
      const expanded = parts.map((part) => orgDataService.resolveCode(part.trim(), ownerCodeMap) ?? part.trim());

      return expanded.join(' / ');
    }

    return ownerCode;
  }

  /**
   * Expands a GCAT manufacturer OrgCode to its full company name.
   * Handles composite codes with "/" separator (e.g., "EADSB/THALR").
   * Returns the raw code if no mapping is found (preserves info).
   */
  static extractManufacturer(manufacturerCode: string): string {
    if (!manufacturerCode || manufacturerCode === '') {
      return t7e('Common.unknown');
    }

    // Enhanced Catalog already has full names
    if (manufacturerCode.length > 12) {
      return manufacturerCode;
    }

    // Try R2 org data first, fall back to bundled static map
    const direct = orgDataService.resolveCode(manufacturerCode, manufacturerCodeMap);

    if (direct) {
      return direct;
    }

    // Split composite codes and look up each part
    if (manufacturerCode.includes('/')) {
      const parts = manufacturerCode.split('/');
      const expanded = parts.map((part) => orgDataService.resolveCode(part.trim(), manufacturerCodeMap) ?? part.trim());

      return expanded.join(' / ');
    }

    return manufacturerCode;
  }

  private static readonly shapeAbbreviations_: Record<string, string> = {
    ann: 'Annulus',
    ant: 'Antenna',
    cone: 'Cone',
    cruci: 'Cruciform',
    cyl: 'Cylinder',
    dcone: 'Double Cone',
    dish: 'Dish',
    ell: 'Ellipsoid',
    frust: 'Frustum',
    'half cyl': 'Half Cylinder',
    'half hex prism': 'Half Hexagonal Prism',
    hept: 'Heptagonal',
    'hept prism': 'Heptagonal Prism',
    hex: 'Hexagonal',
    'hex cyl': 'Hexagonal Cylinder',
    'hex-cyl': 'Hexagonal Cylinder',
    hexadec: 'Hexadecagonal',
    'hexadec cyl': 'Hexadecagonal Cylinder',
    'ico poly': 'Icosahedral Polyhedron',
    irr: 'Irregular',
    nonag: 'Nonagonal',
    oct: 'Octagonal',
    'oct cyl': 'Octagonal Cylinder',
    'oct dcone': 'Octagonal Double Cone',
    'oct frust': 'Octagonal Frustum',
    pan: 'Panel',
    'part cyl': 'Partial Cylinder',
    'pent cyl': 'Pentagonal Cylinder',
    poly: 'Polyhedron',
    'step cyl': 'Stepped Cylinder',
    'taper cyl': 'Tapered Cylinder',
    trap: 'Trapezoidal',
    'trap cyl': 'Trapezoidal Cylinder',
    'tri cyl': 'Triangular Cylinder',
    trunc: 'Truncated',
    'trunc cone': 'Truncated Cone',
    'trunc prism': 'Truncated Prism',
    'trunc pyramid': 'Truncated Pyramid',
    'trunc tetrahedron': 'Truncated Tetrahedron',
    trapezoid: 'Trapezoid',
    'flared cyl': 'Flared Cylinder',
    'domed cyl': 'Domed Cylinder',
  };

  /**
   * Expands abbreviated shape descriptions from the catalog into full words.
   * Handles composite shapes like "Cyl + 2 Pan" → "Cylinder + 2 Panel".
   * Returns the original string if already descriptive (longer than 30 chars).
   */
  static extractShape(shape: string): string {
    if (!shape || shape === '') {
      return t7e('Common.unknown');
    }

    // Already a full description
    if (shape.length > 30) {
      return shape;
    }

    // Split on "+" to handle composite shapes, expand each part
    const parts = shape.split('+').map((part) => {
      const segment = part.trim();

      if (!segment) {
        return '';
      }

      // Extract leading number if present (e.g., "2 Pan" → number=2, rest="Pan")
      const numMatch = /^(?<num>\d+)\s+(?<rest>.+)$/u.exec(segment);
      let prefix = '';
      let token = segment;

      if (numMatch?.groups) {
        prefix = `${numMatch.groups.num} `;
        token = numMatch.groups.rest;
      }

      const lookup = token.toLowerCase();
      const expanded = StringExtractor.shapeAbbreviations_[lookup];

      return expanded ? `${prefix}${expanded}` : `${prefix}${token}`;
    });

    return parts.filter((p) => p).join(' + ');
  }

  static getCountryCode(country?: string) {
    if (!country || country === '') {
      return '';
    }

    // Fix known typo in external data
    country = country === 'UnitedKingdom' ? 'United Kingdom' : country;
    const countryCode = countryCodeList[country];

    if (!countryCode) {
      errorManagerInstance.debug(`Unknown country: ${country}`);

      return '';
    }

    return countryCode;
  }
}
