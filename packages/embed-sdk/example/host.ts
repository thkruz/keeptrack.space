import { createKeepTrackEmbed, type EmbedObject, type KeepTrackEmbed } from '../src/index.js';

const SATS: EmbedObject[] = [
  {
    hostId: 'iss',
    name: 'ISS (ZARYA)',
    norad: '25544',
    tle1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
    tle2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
  },
  {
    hostId: 'demo-1',
    name: 'DEMO-1 (fictional)',
    tle1: '1 80001U 24001A   08264.51782528  .00000000  00000-0  00000-0 0  9994',
    tle2: '2 80001  97.4000 100.0000 0010000  90.0000 270.0000 15.12000000    11',
  },
];

const logEl = document.getElementById('log') as HTMLElement;
const log = (msg: string): void => {
  logEl.textContent = `${new Date().toISOString().slice(11, 19)} ${msg}\n${logEl.textContent}`.slice(0, 4000);
};

async function main(): Promise<void> {
  const embed: KeepTrackEmbed = await createKeepTrackEmbed({
    container: document.getElementById('kt') as HTMLElement,
    src: './keeptrack/index.html',
    config: {
      apiVersion: '1',
      catalog: { mode: 'scenario', objects: SATS },
      ownership: { selection: 'host', time: 'host' },
    },
    onProgress: log,
  });

  const list = document.getElementById('sats') as HTMLElement;

  for (const sat of SATS) {
    const btn = document.createElement('button');

    btn.textContent = sat.name;
    btn.addEventListener('click', () => {
      // Real objects can be selected by NORAD; fictional ones only by hostId.
      void embed.select(sat.norad ? { norad: sat.norad } : { hostId: sat.hostId });
    });
    list.appendChild(btn);
  }

  const slider = document.getElementById('time') as HTMLInputElement;
  const base = embed.getTime().timeMs;

  slider.addEventListener('input', () => embed.setTime(base + Number(slider.value) * 60_000));

  embed.on('selectionChanged', (e) => log(`selectionChanged: ${e.object?.name ?? 'none'} (${e.source})`));
  embed.on('timeChanged', (e) => log(`timeChanged: ${new Date(e.timeMs).toISOString()} (${e.source})`));
  embed.on('changeRequested', (e) => log(`changeRequested: ${e.domain}`));
}

main().catch((e: Error) => log(`ERROR: ${e.message}`));
