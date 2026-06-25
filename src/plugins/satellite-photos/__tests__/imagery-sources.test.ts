import {
  computeElektroSlot,
  computeHimawariSlot,
  elektroUrl,
  formatUtcTime,
  himawariUrl,
  IMAGERY_SOURCES,
} from '@app/plugins/satellite-photos/imagery-sources';

describe('imagery-sources', () => {
  describe('formatUtcTime', () => {
    it('formats with a valid BCP-47 locale (not the legacy en-UK)', () => {
      const out = formatUtcTime(new Date('2025-06-15T14:30:00Z'));

      expect(out).toContain('2025');
      expect(out).toContain('14:30');
      // 24-hour clock, no AM/PM.
      expect(out.toLowerCase()).not.toContain('pm');
    });
  });

  describe('computeElektroSlot', () => {
    it('floors to a 30-minute slot backed off ~1h from the present', () => {
      const real = new Date('2025-06-15T14:23:00Z').getTime();
      const slot = computeElektroSlot(new Date(real), real);

      // 14:23 - 60min = 13:23 -> floor to 13:00.
      expect(slot.toISOString()).toBe('2025-06-15T13:00:00.000Z');
    });

    it('falls back to real time when the sim clock is in the future', () => {
      const real = new Date('2025-06-15T14:23:00Z').getTime();
      const future = new Date('2025-06-20T00:00:00Z');
      const slot = computeElektroSlot(future, real);

      expect(slot.toISOString()).toBe('2025-06-15T13:00:00.000Z');
    });

    it('falls back to real time when the sim clock is more than a day in the past', () => {
      const real = new Date('2025-06-15T14:23:00Z').getTime();
      const old = new Date('2025-06-10T00:00:00Z');
      const slot = computeElektroSlot(old, real);

      expect(slot.toISOString()).toBe('2025-06-15T13:00:00.000Z');
    });
  });

  describe('elektroUrl', () => {
    it('derives both date and hour from Moscow time (no >23 overflow across UTC midnight)', () => {
      // 22:00 UTC = 01:00 MSK the next day.
      const url = elektroUrl(new Date('2025-06-15T22:00:00Z'));

      expect(url).toBe('https://electro.ntsomz.ru/i/splash/20250616-0100.jpg');
    });

    it('formats a midday slot in MSK', () => {
      const url = elektroUrl(new Date('2025-06-15T13:00:00Z'));

      expect(url).toBe('https://electro.ntsomz.ru/i/splash/20250615-1600.jpg');
    });
  });

  describe('computeHimawariSlot', () => {
    it('floors to a 10-minute slot backed off 30 minutes and reports past', () => {
      const real = new Date('2025-06-15T14:23:00Z').getTime();
      // Sim clock a minute behind real time so it counts as past (>= real is treated as future).
      const { slot, isFuture } = computeHimawariSlot(new Date(real - 60_000), real);

      // 14:22 - 30min = 13:52 -> floor to 13:50.
      expect(slot.toISOString()).toBe('2025-06-15T13:50:00.000Z');
      expect(isFuture).toBe(false);
    });

    it('reports future when the sim clock is ahead of real time', () => {
      const real = new Date('2025-06-15T14:23:00Z').getTime();
      const { isFuture } = computeHimawariSlot(new Date('2025-06-20T00:00:00Z'), real);

      expect(isFuture).toBe(true);
    });
  });

  describe('himawariUrl', () => {
    it('builds a UTC-dated full-disk URL', () => {
      const url = himawariUrl(new Date('2025-06-15T13:50:00Z'));

      expect(url).toBe('https://himawari8.nict.go.jp/img/D531106/1d/550/2025/06/15/135000_0_0.png');
    });
  });

  describe('IMAGERY_SOURCES', () => {
    it('exposes GOES-19 (East) with the correct SCC and feed', () => {
      const goes19 = IMAGERY_SOURCES.find((s) => s.id === 'goes19');

      expect(goes19).toBeDefined();
      expect(goes19!.sccNum).toBe(60133);
      expect(goes19!.buildImage(new Date(), Date.now()).url).toContain('GOES19');
    });

    it('no longer ships the decommissioned GOES-16 East feed', () => {
      expect(IMAGERY_SOURCES.find((s) => s.id === 'goes16')).toBeUndefined();
    });

    it('every source builds a usable image result', () => {
      const real = Date.now();

      for (const source of IMAGERY_SOURCES) {
        const result = source.buildImage(new Date(real), real);

        expect(result.url.startsWith('https://')).toBe(true);
      }
    });
  });
});
