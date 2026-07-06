/**
 * Declarative preset definitions for the notional missile-scenario generator.
 *
 * A {@link Scenario} is one output file. It is made of one or more {@link Salvo}s -
 * a group of launch sites firing at a target set under a targeting doctrine. The
 * generator (see `generator.ts`) turns each salvo into individual missiles, solves
 * their trajectories, and staggers their launches across `launchWindowSec`.
 *
 * The dropdown is intentionally consolidated to a small set of two-sided conflicts
 * (each exchange shows both sides at once) plus the all-powers Global Thermonuclear
 * War, rather than a long list of one-directional raids. `file` is the emitted JSON
 * name under `public/simulation/`; keep it stable - the plugin's PRESET_RAIDS map
 * references it by name.
 */
import {
  CHINA_SITES,
  CHINA_SUB_SITES,
  CHINA_TARGETS,
  FRANCE_SUB_SITES,
  INDIA_SITES,
  INDIA_TARGETS,
  IRAN_SITES,
  IRAN_TARGETS,
  ISRAEL_SITES,
  ISRAEL_TARGETS,
  LaunchSite,
  NORTH_KOREA_SITES,
  NORTH_KOREA_TARGETS,
  PAKISTAN_SITES,
  PAKISTAN_TARGETS,
  RUSSIA_SITES,
  RUSSIA_SUB_SITES,
  RUSSIA_TACTICAL_SITES,
  RUSSIA_TARGETS,
  Target,
  UK_SUB_SITES,
  UKRAINE_SITES,
  UKRAINE_TARGETS,
  USA_SITES,
  USA_SUB_SITES,
  USA_TARGETS,
} from './scenario-data';

/** How a salvo weights military (counterforce) vs population (countervalue) aimpoints. */
export type Doctrine = 'counterforce' | 'countervalue' | 'mixed';

/** One attacking group: a set of launch sites firing at a target set under a doctrine. */
export interface Salvo {
  /** Country label stamped on every missile object (drives the color/flag in-app). */
  attacker: string;
  sites: LaunchSite[];
  targets: Target[];
  doctrine: Doctrine;
  /** Optional hard cap on missiles from this salvo (before the scenario-wide cap). */
  maxMissiles?: number;
}

/** One generated scenario file. */
export interface Scenario {
  /** Short id used on the CLI (`--scenario <id>`). */
  id: string;
  /** Output filename under public/simulation/ (keep stable - the plugin references it). */
  file: string;
  title: string;
  description: string;
  salvos: Salvo[];
  /** Seconds over which launches are spread (staggered via on-pad padding). */
  launchWindowSec: number;
  /** Overall missile cap for the file (defaults to 480, under the 500-slot reservation). */
  totalCap?: number;
}

/** Default hard cap - the catalog reserves 500 missile slots, so stay under it. */
export const DEFAULT_TOTAL_CAP = 480;

// Composed attacker arsenals: land-based silos/road-mobile launchers + that nation's SSBNs.
const USA_ARSENAL: LaunchSite[] = [...USA_SITES, ...USA_SUB_SITES];
const RUSSIA_ARSENAL: LaunchSite[] = [...RUSSIA_SITES, ...RUSSIA_SUB_SITES];
const CHINA_ARSENAL: LaunchSite[] = [...CHINA_SITES, ...CHINA_SUB_SITES];

export const SCENARIOS: Scenario[] = [
  // ---------------------------------------------------------------------
  // Regional conflicts (grouped as "Regional Conflicts" in the dropdown).
  // ---------------------------------------------------------------------
  {
    id: 'iran-israel',
    file: 'Exchange_Iran_Israel.json',
    title: 'Iran / Israel Exchange',
    description: 'A two-sided regional exchange: Iranian MRBMs saturate Israeli cities and bases while Israeli Jericho missiles strike Iranian nuclear and leadership targets.',
    launchWindowSec: 300,
    salvos: [
      { attacker: 'Iran', sites: IRAN_SITES, targets: ISRAEL_TARGETS, doctrine: 'mixed' },
      { attacker: 'Israel', sites: ISRAEL_SITES, targets: IRAN_TARGETS, doctrine: 'counterforce' },
    ],
  },
  {
    id: 'russia-ukraine',
    file: 'Exchange_Russia_Ukraine.json',
    title: 'Russia / Ukraine Exchange',
    description: 'A two-sided tactical exchange: Russian Iskander launchers strike Ukrainian command and cities while Ukrainian short-range ballistic missiles hit Russian border-region military targets.',
    launchWindowSec: 300,
    salvos: [
      { attacker: 'Russia', sites: RUSSIA_TACTICAL_SITES, targets: UKRAINE_TARGETS, doctrine: 'mixed' },
      { attacker: 'Ukraine', sites: UKRAINE_SITES, targets: RUSSIA_TARGETS, doctrine: 'counterforce' },
    ],
  },
  {
    id: 'india-pakistan',
    file: 'Exchange_India_Pakistan.json',
    title: 'India / Pakistan Exchange',
    description: 'A two-sided South Asian exchange between Indian Agni and Pakistani Shaheen/Ghauri ballistic forces, striking each other\'s command centers, strategic bases, and metros.',
    launchWindowSec: 300,
    salvos: [
      { attacker: 'India', sites: INDIA_SITES, targets: PAKISTAN_TARGETS, doctrine: 'mixed' },
      { attacker: 'Pakistan', sites: PAKISTAN_SITES, targets: INDIA_TARGETS, doctrine: 'mixed' },
    ],
  },

  // ---------------------------------------------------------------------
  // Strategic exchanges (grouped as "Strategic Exchanges" in the dropdown).
  // ---------------------------------------------------------------------
  {
    id: 'usa-russia',
    file: 'Exchange_USA_Russia.json',
    title: 'USA / Russia Exchange',
    description: 'A full two-sided strategic exchange: both arsenals - silo, road-mobile, and submarine-launched - fire on each other\'s forces and cities at once.',
    launchWindowSec: 420,
    salvos: [
      { attacker: 'Russia', sites: RUSSIA_ARSENAL, targets: USA_TARGETS, doctrine: 'mixed' },
      { attacker: 'United States', sites: USA_ARSENAL, targets: RUSSIA_TARGETS, doctrine: 'mixed' },
    ],
  },
  {
    id: 'usa-china',
    file: 'Exchange_USA_China.json',
    title: 'USA / China Exchange',
    description: 'A full two-sided Pacific strategic exchange between US and Chinese silo, road-mobile, and submarine-launched forces.',
    launchWindowSec: 420,
    salvos: [
      { attacker: 'China', sites: CHINA_ARSENAL, targets: USA_TARGETS, doctrine: 'mixed' },
      { attacker: 'United States', sites: USA_ARSENAL, targets: CHINA_TARGETS, doctrine: 'mixed' },
    ],
  },
  {
    id: 'usa-northkorea',
    file: 'Exchange_USA_NorthKorea.json',
    title: 'USA / North Korea Exchange',
    description: 'North Korea launches its road-mobile ICBMs on US Pacific and mainland targets while the US executes a counterforce strike against North Korean leadership and missile infrastructure.',
    launchWindowSec: 240,
    salvos: [
      { attacker: 'North Korea', sites: NORTH_KOREA_SITES, targets: USA_TARGETS, doctrine: 'countervalue' },
      { attacker: 'United States', sites: USA_ARSENAL, targets: NORTH_KOREA_TARGETS, doctrine: 'counterforce', maxMissiles: 45 },
    ],
  },
  {
    id: 'china-india',
    file: 'Exchange_China_India.json',
    title: 'China / India Exchange',
    description: 'A two-sided Himalayan-theater exchange: Chinese DF missiles strike Indian cities and bases while Indian Agni-IV/V missiles reach Chinese command and industrial centers.',
    launchWindowSec: 360,
    salvos: [
      { attacker: 'China', sites: CHINA_SITES, targets: INDIA_TARGETS, doctrine: 'mixed', maxMissiles: 60 },
      { attacker: 'India', sites: INDIA_SITES, targets: CHINA_TARGETS, doctrine: 'mixed' },
    ],
  },

  // ---------------------------------------------------------------------
  // The all-powers showcase.
  // ---------------------------------------------------------------------
  {
    id: 'global-thermonuclear-war',
    file: 'GlobalThermonuclearWar.json',
    title: 'Global Thermonuclear War',
    description: 'A worldwide exchange spanning every major nuclear power - the US, Russia, China, North Korea, the UK, and France - firing silo, road-mobile, and submarine-launched missiles across the globe.',
    launchWindowSec: 600,
    totalCap: 500,
    salvos: [
      { attacker: 'Russia', sites: RUSSIA_ARSENAL, targets: USA_TARGETS, doctrine: 'mixed', maxMissiles: 110 },
      { attacker: 'China', sites: CHINA_ARSENAL, targets: USA_TARGETS, doctrine: 'mixed', maxMissiles: 55 },
      { attacker: 'North Korea', sites: NORTH_KOREA_SITES, targets: USA_TARGETS, doctrine: 'countervalue', maxMissiles: 20 },
      { attacker: 'United Kingdom', sites: UK_SUB_SITES, targets: RUSSIA_TARGETS, doctrine: 'mixed', maxMissiles: 16 },
      { attacker: 'France', sites: FRANCE_SUB_SITES, targets: RUSSIA_TARGETS, doctrine: 'mixed', maxMissiles: 16 },
      { attacker: 'United States', sites: USA_ARSENAL, targets: RUSSIA_TARGETS, doctrine: 'mixed', maxMissiles: 110 },
      { attacker: 'United States', sites: USA_ARSENAL, targets: CHINA_TARGETS, doctrine: 'mixed', maxMissiles: 65 },
      { attacker: 'United States', sites: USA_ARSENAL, targets: NORTH_KOREA_TARGETS, doctrine: 'counterforce', maxMissiles: 15 },
    ],
  },
];

/** Look up a scenario by its CLI id. */
export const getScenario = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);
