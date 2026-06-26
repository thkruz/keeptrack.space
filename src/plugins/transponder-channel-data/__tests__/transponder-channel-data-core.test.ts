import {
  buildExportRows,
  CHANNEL_COLUMNS,
  ChannelInfo,
  dedupeChannels,
  filterChannels,
  sortChannels,
} from '@app/plugins/transponder-channel-data/transponder-channel-data-core';

const makeEntry = (over: Partial<ChannelInfo> = {}): ChannelInfo => ({
  satellite: 'ASTRA 1N',
  tvchannel: 'BBC One',
  beam: 'Europe',
  freq: '10773 H',
  system: 'DVB-S2',
  SRFEC: '22000 2/3',
  video: 'MPEG-4',
  lang: 'English',
  encryption: 'Free',
  ...over,
});

describe('transponder-channel-data-core', () => {
  describe('CHANNEL_COLUMNS', () => {
    it('covers every ChannelInfo field exactly once', () => {
      const keys = CHANNEL_COLUMNS.map((c) => c.key).sort((a, b) => a.localeCompare(b));
      const expected = Object.keys(makeEntry()).sort((a, b) => a.localeCompare(b));

      expect(keys).toEqual(expected);
    });
  });

  describe('dedupeChannels', () => {
    it('removes entries with the same channel/freq/beam', () => {
      const data = [makeEntry(), makeEntry(), makeEntry({ tvchannel: 'BBC Two' })];

      expect(dedupeChannels(data)).toHaveLength(2);
    });

    it('keeps entries that differ in freq or beam', () => {
      const data = [
        makeEntry(),
        makeEntry({ freq: '11000 V' }),
        makeEntry({ beam: 'Spotbeam' }),
      ];

      expect(dedupeChannels(data)).toHaveLength(3);
    });

    it('handles an empty array', () => {
      expect(dedupeChannels([])).toHaveLength(0);
    });
  });

  describe('filterChannels', () => {
    const data = [
      makeEntry({ tvchannel: 'BBC One', lang: 'English' }),
      makeEntry({ tvchannel: 'ZDF', lang: 'German' }),
    ];

    it('returns all rows for an empty query', () => {
      expect(filterChannels(data, '   ')).toHaveLength(2);
    });

    it('matches case-insensitively across any column', () => {
      expect(filterChannels(data, 'german')).toEqual([data[1]]);
      expect(filterChannels(data, 'bbc')).toEqual([data[0]]);
    });

    it('returns an empty array when nothing matches', () => {
      expect(filterChannels(data, 'nope')).toHaveLength(0);
    });
  });

  describe('sortChannels', () => {
    const data = [
      makeEntry({ tvchannel: 'Charlie' }),
      makeEntry({ tvchannel: 'alpha' }),
      makeEntry({ tvchannel: 'Bravo' }),
    ];

    it('sorts ascending case-insensitively without mutating input', () => {
      const result = sortChannels(data, 'tvchannel', 'asc');

      expect(result.map((r) => r.tvchannel)).toEqual(['alpha', 'Bravo', 'Charlie']);
      expect(data[0].tvchannel).toBe('Charlie');
    });

    it('sorts descending', () => {
      const result = sortChannels(data, 'tvchannel', 'desc');

      expect(result.map((r) => r.tvchannel)).toEqual(['Charlie', 'Bravo', 'alpha']);
    });

    it('sorts frequency numerically', () => {
      const freqs = [
        makeEntry({ freq: '10773 H' }),
        makeEntry({ freq: '9750 V' }),
        makeEntry({ freq: '11000 H' }),
      ];
      const result = sortChannels(freqs, 'freq', 'asc');

      expect(result.map((r) => r.freq)).toEqual(['9750 V', '10773 H', '11000 H']);
    });
  });

  describe('buildExportRows', () => {
    it('produces one plain row per entry with all columns', () => {
      const rows = buildExportRows([makeEntry()]);

      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0])).toEqual(CHANNEL_COLUMNS.map((c) => c.key));
    });
  });
});
