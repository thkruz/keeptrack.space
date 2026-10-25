import { CatalogSource } from '@ootk/src/main';

/** True for a real NORAD number; synthetic JSC Vimpel objects carry '', '0' or '00000'. */
export const hasRealSccNum = (sccNum?: string | null): boolean => typeof sccNum === 'string' && sccNum.length > 0 && !/^0+$/u.test(sccNum);

/**
 * True for a JSC Vimpel object that has no NORAD number (and so no COSPAR ID).
 *
 * A real catalog object that took a newer Vimpel elset (source VIMPEL, real
 * sccNum) is NOT synthetic and keeps its real designator.
 */
export const isSyntheticVimpel = (obj?: { source?: string | null; sccNum?: string | null } | null): boolean => obj?.source === CatalogSource.VIMPEL && !hasRealSccNum(obj.sccNum);
