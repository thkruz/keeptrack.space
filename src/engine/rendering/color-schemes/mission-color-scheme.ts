/* eslint-disable complexity */
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { BaseObject, DetailedSatellite } from '@ootk/src/main';
import { ColorScheme, ColorSchemeColorMap } from './color-scheme';

export interface MissionColorSchemeColorMap extends ColorSchemeColorMap {
  missionMilitary: rgbaArray;
  missionCommunications: rgbaArray;
  missionTechnology: rgbaArray;
  missionEarthObservation: rgbaArray;
  missionScience: rgbaArray;
  missionAstronomy: rgbaArray;
  missionNavigation: rgbaArray;
  missionOther: rgbaArray;
}

export class MissionColorScheme extends ColorScheme {
  readonly label = 'Mission';
  readonly id = 'MissionColorScheme';
  static readonly id = 'MissionColorScheme';
  missionCache: Map<number, string | null> = new Map();

  static readonly uniqueObjectTypeFlags = {
    missionMilitary: true,
    missionCommunications: true,
    missionTechnology: true,
    missionEarthObservation: true,
    missionScience: true,
    missionAstronomy: true,
    missionNavigation: true,
    missionOther: true,
  };

  static readonly uniqueColorTheme = {
    missionMilitary: [0.8, 0.0, 0.0, 1.0] as rgbaArray, // Red
    missionCommunications: [0.0, 0.5, 1.0, 1.0] as rgbaArray, // Sky Blue
    missionTechnology: [0.0, 1.0, 0.0, 1.0] as rgbaArray, // Green
    missionEarthObservation: [0.5, 0.25, 0.0, 1.0] as rgbaArray, // Brown
    missionScience: [1.0, 1.0, 0.0, 1.0] as rgbaArray, // Yellow
    missionAstronomy: [0.5, 0.0, 0.5, 1.0] as rgbaArray, // Purple
    missionNavigation: [1.0, 0.5, 0.0, 1.0] as rgbaArray, // Orange
    missionOther: [0.5, 0.5, 0.5, 1.0] as rgbaArray, // Gray
  };

  constructor() {
    super(MissionColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...MissionColorScheme.uniqueObjectTypeFlags,
    };
  }

  update(obj: BaseObject): ColorInformation {
    if (!(obj instanceof DetailedSatellite)) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const mission = this.missionCache.get(obj.id) ?? this.categorizeSatelliteMission_(obj.mission);

    this.missionCache.set(obj.id, mission);

    switch (mission) {
      case 'Military':
        if (this.objectTypeFlags.missionMilitary) {
          return {
            color: this.colorTheme.missionMilitary,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Communication':
        if (this.objectTypeFlags.missionCommunications) {
          return {
            color: this.colorTheme.missionCommunications,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Technology':
        if (this.objectTypeFlags.missionTechnology) {
          return {
            color: this.colorTheme.missionTechnology,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Earth Observation':
        if (this.objectTypeFlags.missionEarthObservation) {
          return {
            color: this.colorTheme.missionEarthObservation,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Science':
        if (this.objectTypeFlags.missionScience) {
          return {
            color: this.colorTheme.missionScience,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Astronomy':
        if (this.objectTypeFlags.missionAstronomy) {
          return {
            color: this.colorTheme.missionAstronomy,
            pickable: Pickable.Yes,
          };
        }
        break;
      case 'Navigation':
        if (this.objectTypeFlags.missionNavigation) {
          return {
            color: this.colorTheme.missionNavigation,
            pickable: Pickable.Yes,
          };
        }
        break;
      default:
        if (this.objectTypeFlags.missionOther) {
          return {
            color: this.colorTheme.missionOther,
            pickable: Pickable.Yes,
          };
        }
        break;
    }

    // If no match found, return deselected color
    return {
      color: this.colorTheme.deselected,
      pickable: Pickable.No,
    };

  }

  /**
   * Categorizes satellite mission descriptions into one of 6 main categories or returns null if no match.
   *
   * @param mission The satellite mission description to categorize
   * @returns One of the 6 main categories or null if no close match
   */
  categorizeSatelliteMission_(mission: string): string | null {
    // If description is empty, return null
    if (!mission || mission.trim() === '') {
      return null;
    }

    // Normalize the description to lowercase for consistent matching
    const normalizedDesc = mission.toLowerCase();

    // Define mapping of keywords to categories
    const categoryKeywords: Record<string, string[]> = {
      'Military': [
        'military', 'defense', 'reconnaissance', 'intelligence', 'surveillance',
        'spy', 'military communications', 'milcom', 'military satellite',
        'reconnaissance satellite', 'military observation', 'military reconnaissance',
        'military technology', 'military mission', 'military application',
        'early warning', 'missile warning', 'strategic warning', 'threat detection',
        'ballistic missile warning', 'nuclear warning',
      ],
      'Communication': [
        'communication', 'communications', 'comsat', 'amateur radio', 'radio communication',
        'broadcasting', 'comms', 'relay', 'store dump', 'direct broadcasting', 'data relay',
        'm2m', 'iot', 'radio amateur', 'store-dump', 'store and forward',
      ],
      'Technology': [
        'technology', 'experimental', 'evaluation', 'tech', 'demonstration', 'test',
        'vehicle evaluation', 'dummy', 'calibration', 'technological', 'testing',
        'inspection', 'servicing', 'fluids', 'mass model', 'docking', 'satellite deployment',
        'tether', 'inflatable', 'thermospheric',
      ],
      'Earth Observation': [
        'earth observation', 'observation', 'remote sensing', 'imaging', 'radar',
        'environmental', 'ocean surveillance', 'ocean observation', 'meteorology',
        'weather', 'altimetry', 'oceanography', 'land', 'sar', 'resource', 'environment',
        'lidar', 'traffic monitoring', 'mapping', 'geodesy', 'ecology', 'geospatial',
      ],
      'Science': [
        'science', 'research', 'scientific', 'study', 'exploration', 'aeronomy',
        'particle', 'magnetic field', 'plasma', 'atmospheric', 'density', 'cosmic rays',
        'ionosphere', 'magnetosphere', 'geodesy', 'air density', 'cosmology', 'atmospheric',
        'physics', 'fundamental', 'life science', 'gravitational', 'space science',
      ],
      'Astronomy': [
        'astronomy', 'gamma ray', 'uv', 'ir', 'x-ray', 'infrared', 'ultraviolet',
        'telescope', 'cosmic', 'solar', 'sun', 'stars', 'gamma', 'astrometry',
        'observatory', 'spectroscopy', 'multi-wavelength', 'radio astronomy', 'solar observatory',
      ],
      'Navigation': [
        'global positioning', 'navigation', 'positioning', 'gps', 'timing', 'nav', 'tracking', 'position',
        'navigational', 'sar transponder', 'search and rescue', 'transponder', 'cospas-sarsat',
      ],
    };

    // Score system for matching
    const scores: Record<string, number> = {
      'Military': 0,
      'Communication': 0,
      'Technology': 0,
      'Earth Observation': 0,
      'Science': 0,
      'Astronomy': 0,
      'Navigation': 0,
    };

    // Calculate scores
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      keywords.forEach((keyword) => {
        // Check for exact word match
        if (new RegExp(`\\b${keyword}\\b`, 'u').test(normalizedDesc)) {
          scores[category] += 2;
        } else if (normalizedDesc.includes(keyword)) {
          // Check for partial keyword match
          scores[category] += 1;
        }

        // Bonus points for these appearing at the start
        if (normalizedDesc.startsWith(keyword)) {
          scores[category] += 3;
        }
      });

      // Check for explicit main category mentions (e.g., "Communication" appearing directly)
      if (new RegExp(`\\b${category.toLowerCase()}\\b`, 'u').test(normalizedDesc)) {
        scores[category] += 4;
      }
    });

    // Special case handling for common abbreviations and specialized terms
    if ((/\belint\b|\bsigint\b|\bcomint\b/iu).test(normalizedDesc)) {
      scores.Communication += 2; // Intelligence gathering is often communication-related
    }

    if ((/\bearth science\b|\bclimate\b|\bdisaster\b|\bforest\b|\burban\b/iu).test(normalizedDesc)) {
      scores['Earth Observation'] += 2;
    }

    if ((/\breconnaissance\b|\bmilitary\b|\bsurveillance\b|\bdefense\b/iu).test(normalizedDesc)) {
      // These could be Earth observation or communication, split the score
      scores['Earth Observation'] += 1;
      scores.Communication += 1;
    }

    if ((/\borbiter\b|\bflyby\b|\blander\b|\bcosmic\b|\bsolar\b/iu).test(normalizedDesc)) {
      scores.Science += 1;
    }

    if ((/\basat\b|\bnuclear\b|\bearly warning\b/iu).test(normalizedDesc)) {
      scores.Technology += 1;
    }

    // Find the highest scoring category
    let highestScore = 0;
    let bestCategory: string | null = null;

    Object.entries(scores).forEach(([category, score]) => {
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    });

    // Only return a category if the score is above a minimum threshold
    return highestScore >= 2 ? bestCategory : null;
  }

  static readonly layersHtml = html`
  <ul id="layers-list-countries">
    <li>
      <div class="Square-Box layers-missionMilitary-box"></div>
      Military
    </li>
    <li>
      <div class="Square-Box layers-missionCommunications-box"></div>
      Communications
    </li>
    <li>
      <div class="Square-Box layers-missionTechnology-box"></div>
      Technology
    </li>
    <li>
      <div class="Square-Box layers-missionEarthObservation-box"></div>
      Earth Observation
    </li>
    <li>
      <div class="Square-Box layers-missionScience-box"></div>
      Science
    </li>
    <li>
      <div class="Square-Box layers-missionAstronomy-box"></div>
      Astronomy
    </li>
    <li>
      <div class="Square-Box layers-missionNavigation-box"></div>
      Navigation
    </li>
    <li>
      <div class="Square-Box layers-missionOther-box"></div>
      Other
    </li>
  </ul>
  `.trim();
}
