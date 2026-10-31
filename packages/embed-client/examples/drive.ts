// Drives a KeepTrack embed through a relay: selects the ISS, steps time and prints position and passes.
//
//   Terminal 1:  node ../embed-relay/dist/cli.js --port 8787 --token-file relay-token.txt
//   Page:        createKeepTrackEmbed({ ..., remote: { url: 'ws://127.0.0.1:8787', session: 'demo', token: '<token>' } })
//   Terminal 2:  KT_RELAY_URL=ws://127.0.0.1:8787 KT_SESSION=demo KT_RELAY_TOKEN=<token> npm run example
import { connectKeepTrack } from '../src/index.js';

const client = await connectKeepTrack({
  url: process.env.KT_RELAY_URL ?? 'ws://127.0.0.1:8787',
  session: process.env.KT_SESSION ?? 'demo',
  token: process.env.KT_RELAY_TOKEN,
});

client.on('selectionChanged', (e) => console.log(`event selectionChanged: ${e.object?.name ?? 'none'} (source ${e.source})`));
await client.waitForEngine();

const ISS = { norad: '25544' };

await client.select(ISS);
const t0 = (await client.getTime()).timeMs;

for (let step = 0; step < 3; step++) {
  const timeMs = t0 + step * 10 * 60_000;

  await client.setTime(timeMs);
  const pos = await client.getPosition(ISS, timeMs);

  console.log(new Date(timeMs).toISOString(), pos ? `lat ${pos.lla.lat.toFixed(2)} lon ${pos.lla.lon.toFixed(2)} alt ${pos.lla.altKm.toFixed(0)} km` : 'no position');
}

await client.upsertSensors([{ hostId: 'demo-radar', name: 'Demo radar', lat: 42.6, lon: -71.5, altKm: 0.1, minAz: 0, maxAz: 360, minEl: 5, maxEl: 90, minRngKm: 0, maxRngKm: 5000 }]);
const windows = await client.getAccessWindows('demo-radar', ISS, t0, t0 + 24 * 3600_000);

console.log(`${windows.length} access windows in the next 24 h`);
for (const w of windows.slice(0, 5)) {
  console.log(`  ${new Date(w.startMs).toISOString()} to ${new Date(w.endMs).toISOString()}, max el ${w.maxElDeg.toFixed(1)} deg`);
}
await client.removeSensors(['demo-radar']);
client.close();
