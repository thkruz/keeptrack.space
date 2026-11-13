import { BaseObject, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';

/**
 * Plain-words description of what an object is ("Inactive weather satellite"), built from the
 * type, status and mission fields the catalog already has. Returns a locale key under
 * `SatInfoBoxObject.Summary`; the caller translates it.
 */

export type MissionKind = 'military' | 'communications' | 'navigation' | 'weather' | 'earthObservation' | 'astronomy' | 'science' | 'technology' | 'other';

export type ActivityKind = 'active' | 'inactive' | 'plain';

/** Ordered: the first matching rule wins (weather and astronomy before the broader science). */
const MISSION_RULES: ReadonlyArray<{ kind: MissionKind; pattern: RegExp }> = [
  { kind: 'weather', pattern: /weather|meteorolog|climate/u },
  { kind: 'astronomy', pattern: /astronom|telescope|observatory/u },
  { kind: 'navigation', pattern: /navigation|positioning|gnss|gps/u },
  { kind: 'military', pattern: /military|defen[sc]e|reconnaissance|intelligence|surveillance|early warning|milcom/u },
  { kind: 'communications', pattern: /communicat|telecom|broadcast|relay|data relay|internet/u },
  { kind: 'earthObservation', pattern: /earth observation|remote sensing|imaging|imagery|earth resources|mapping/u },
  { kind: 'technology', pattern: /technology|demonstrat|experiment|engineering/u },
  { kind: 'science', pattern: /science|scientific|research|space physics|microgravity|biolog/u },
];

export const classifyMission = (mission: string | undefined | null): MissionKind => {
  if (typeof mission !== 'string' || mission.trim() === '') {
    return 'other';
  }

  const text = mission.toLowerCase();

  for (const rule of MISSION_RULES) {
    if (rule.pattern.test(text)) {
      return rule.kind;
    }
  }

  return 'other';
};

export const classifyActivity = (status: PayloadStatus | string | undefined): ActivityKind => {
  switch (status) {
    case PayloadStatus.OPERATIONAL:
    case PayloadStatus.PARTIALLY_OPERATIONAL:
    case PayloadStatus.EXTENDED_MISSION:
      return 'active';
    case PayloadStatus.NONOPERATIONAL:
    case PayloadStatus.DECAYED:
      return 'inactive';
    default:
      return 'plain';
  }
};

/** Crewed stations in low Earth orbit: ISS (ZARYA) and the Tiangong modules. They are payloads, but "Active satellite" undersells them (#233). */
const CREWED_STATION_SCC_ = new Set(['25544', '48274', '53239', '54216']);
const CREWED_STATION_NAME_ = /^(iss[ (]|iss$|tiangong|tianhe|wentian|mengtian)/iu;

const isCrewedStation_ = (sat: Satellite): boolean => CREWED_STATION_SCC_.has(String(sat.sccNum ?? '').replace(/^0+/u, '')) || CREWED_STATION_NAME_.test(sat.name ?? '');

/** Locale key for the plain-words line, or null when there is nothing to say. */
export const getObjectSummaryKey = (obj: BaseObject | null | undefined): string | null => {
  if (!obj) {
    return null;
  }

  if (obj.isMissile()) {
    return 'SatInfoBoxObject.Summary.missile';
  }

  switch (obj.type) {
    case SpaceObjectType.PAYLOAD: {
      const sat = obj as Satellite;

      if (isCrewedStation_(sat)) {
        return 'SatInfoBoxObject.Summary.crewedStation';
      }

      return `SatInfoBoxObject.Summary.Payload.${classifyActivity(sat.status)}.${classifyMission(sat.mission)}`;
    }
    case SpaceObjectType.ROCKET_BODY:
      return 'SatInfoBoxObject.Summary.rocketBody';
    case SpaceObjectType.DEBRIS:
      return 'SatInfoBoxObject.Summary.debris';
    case SpaceObjectType.SPECIAL:
      return 'SatInfoBoxObject.Summary.special';
    default:
      return null;
  }
};

/**
 * Hook for a later AI-generated summary (#219): a provider returns finished text for the
 * object, or null to fall back to the plain-words line. No provider is registered today.
 */
export type ObjectSummaryProvider = (obj: BaseObject) => string | null;

const providers_: ObjectSummaryProvider[] = [];

export const registerObjectSummaryProvider = (provider: ObjectSummaryProvider): void => {
  providers_.push(provider);
};

export const getProvidedObjectSummary = (obj: BaseObject): string | null => {
  for (const provider of providers_) {
    const text = provider(obj);

    if (typeof text === 'string' && text.trim() !== '') {
      return text;
    }
  }

  return null;
};
