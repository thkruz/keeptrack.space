/**
 * Shared types for the UI gate. Own result shape on purpose: scripts/gates/lib/report.ts did not exist when this was
 * written; map `UiFinding` onto it when the code gates land.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HitInfo {
  /** Selector of the topmost element at the control's centre, or null when nothing was hit. */
  by: string | null;
  /** How the topmost element relates to the control. */
  relation: 'self' | 'descendant' | 'ancestor' | 'label' | 'other' | 'none';
}

export interface ElementRecord {
  idx: number;
  parent: number;
  selector: string;
  tag: string;
  rect: Rect;
  scrollW: number;
  scrollH: number;
  clientW: number;
  clientH: number;
  overflowX: string;
  overflowY: string;
  textOverflow: string;
  whiteSpace: string;
  lineClamp: boolean;
  /** Element has a direct non-blank text node (or is a button/input with a value). */
  hasText: boolean;
  position: string;
  zIndex: string;
  isControl: boolean;
  /** Native widgets that manage their own overflow (select, textarea, checkbox, radio, Materialize select trigger). */
  selfOverflowExempt: boolean;
  /** Some ancestor scrolls (overflow auto/scroll); content beyond the viewport is reachable. */
  inScroller: boolean;
  /** Element sits inside the currently scoped menu root. */
  inMenu: boolean;
  /** Element sits inside an injected detector mutation (check I). */
  inMutation: boolean;
  /** Horizontal bounds [left, right] imposed by ancestors that clip or scroll; null when none (or position fixed). */
  clipX?: [number, number] | null;
  /** Only for controls: what elementsFromPoint returned at the centre. */
  hit?: HitInfo;
}

export interface CollectorResult {
  viewport: { w: number; h: number };
  /** documentElement.scrollWidth - clientWidth. */
  docOverflowX: number;
  elements: ElementRecord[];
}

export type UiRule =
  | 'A-offscreen'
  | 'A-h-overflow'
  | 'B-clipped-text'
  | 'C-sibling-overlap'
  | 'D-occluded-control'
  | 'E-tap-target'
  | 'E-zero-size'
  | 'G-axe';

export interface UiFinding {
  rule: UiRule;
  selector: string;
  detail: string;
  rects: Rect[];
  /** Finding touches an element inside the scoped menu root. */
  inMenu: boolean;
  /** Finding touches an injected mutation. */
  inMutation: boolean;
}

export interface AllowlistEntry {
  rule: string;
  selector: string;
  reason: string;
  /** Optional narrowing; omitted means any. */
  viewport?: string;
  locale?: string;
  menu?: string;
}
