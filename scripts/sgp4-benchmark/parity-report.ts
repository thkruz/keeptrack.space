/**
 * Self-contained HTML report for the SGP4 vs SGP4-XP wasm parity validation.
 * Shares the dataviz reference palette used by the sibling benchmark report.
 */

import type { DeltaStats, ParityReport, ProbeRow } from './validate-parity';

const esc = (s: string): string => s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

const fmtKm = (v: number): string => {
  if (v === 0) {
    return '0';
  }

  return v < 1e-3 ? v.toExponential(2) : v.toFixed(6);
};

const statRow = (label: string, s: DeltaStats): string => `
  <tr>
    <td>${esc(label)}</td>
    <td class="num">${s.n.toLocaleString('en-US')}</td>
    <td class="num">${fmtKm(s.max)}</td>
    <td class="num">${fmtKm(s.p99)}</td>
    <td class="num">${fmtKm(s.p95)}</td>
    <td class="num">${fmtKm(s.median)}</td>
    <td class="num">${fmtKm(s.mean)}</td>
  </tr>`;

const isOk = (status: string): boolean => status === 'ok';

const probeCell = (status: string): string =>
  `<span class="pill ${isOk(status) ? 'ok' : 'no'}">${esc(status)}</span>`;

const probeRow = (p: ProbeRow): string => `
  <tr>
    <td>${esc(p.noradId)}</td>
    <td>${esc((p.name || '').slice(0, 26))}</td>
    <td>${esc(p.regime)}</td>
    <td>${probeCell(p.type0.classic)}</td>
    <td>${probeCell(p.type0.xp)}</td>
    <td>${probeCell(p.type4.classic)}</td>
    <td>${probeCell(p.type4.xp)}</td>
    <td class="num">${p.type0BuildDeltaKm === null ? '—' : fmtKm(p.type0BuildDeltaKm)}</td>
    <td class="num">${p.xpType0VsType4Km === null ? '—' : fmtKm(p.xpType0VsType4Km)}</td>
  </tr>`;

const tile = (label: string, value: string, detail: string, tone: 'pass' | 'fail' | 'neutral' = 'neutral'): string => `
  <div class="tile ${tone}">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value">${value}</div>
    <div class="tile-detail">${esc(detail)}</div>
  </div>`;

export const renderParityReport = (r: ParityReport): string => {
  const tiles = [
    tile(
      'Parity verdict',
      r.parityPass ? 'PASS' : 'FAIL',
      `both builds within ${r.parityThresholdKm} km on classic TLEs`,
      r.parityPass ? 'pass' : 'fail',
    ),
    tile('Max position Δ', `${fmtKm(r.overall.max)} km`, `${r.overall.n.toLocaleString('en-US')} comparisons`),
    tile('Deep-space max Δ', `${fmtKm(r.deepSpace.max)} km`, `${r.deepSpace.n.toLocaleString('en-US')} deep-space samples`),
    tile('Max velocity Δ', `${fmtKm(r.velOverall.max)} km/s`, 'classic vs XP'),
  ].join('');

  const probeConclusion = describeProbe(r);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SGP4 vs SGP4-XP Parity</title>
<style>
  :root {
    --surface-1: #fcfcfb; --page: #f9f9f7; --text-primary: #0b0b0b; --text-secondary: #52514e;
    --text-muted: #898781; --grid: #e1e0d9; --border: rgba(11,11,11,0.10);
    --ok: #1baf7a; --no: #d64550; --accent: #2a78d6;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface-1: #1a1a19; --page: #0d0d0d; --text-primary: #ffffff; --text-secondary: #c3c2b7;
      --text-muted: #898781; --grid: #2c2c2a; --border: rgba(255,255,255,0.10);
      --ok: #199e70; --no: #e0656f; --accent: #3987e5;
    }
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--page);
    color: var(--text-primary); padding: 32px 24px 64px; line-height: 1.45; }
  main { max-width: 1040px; margin: 0 auto; display: grid; gap: 20px; }
  h1 { font-size: 22px; font-weight: 650; }
  h2 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
  .meta { color: var(--text-secondary); font-size: 13px; }
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }
  .subtitle { color: var(--text-muted); font-size: 12.5px; margin-bottom: 12px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
  .tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .tile.pass { border-left: 4px solid var(--ok); }
  .tile.fail { border-left: 4px solid var(--no); }
  .tile-label { font-size: 12px; color: var(--text-secondary); }
  .tile-value { font-size: 26px; font-weight: 650; margin: 2px 0; font-variant-numeric: tabular-nums; }
  .tile-detail { font-size: 12px; color: var(--text-muted); }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--grid); }
  th { color: var(--text-muted); font-weight: 550; font-size: 11.5px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .table-wrap { overflow-x: auto; }
  .note { font-size: 12.5px; color: var(--text-secondary); margin-top: 8px; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 20px; font-size: 11px; font-variant-numeric: tabular-nums; }
  .pill.ok { background: color-mix(in srgb, var(--ok) 20%, transparent); color: var(--ok); }
  .pill.no { background: color-mix(in srgb, var(--no) 20%, transparent); color: var(--no); }
  code { font-size: 12px; background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>SGP4 vs SGP4-XP wasm — parity validation</h1>
    <p class="meta">${esc(r.generatedAt)} · Node ${esc(r.node)}</p>
    <p class="meta">${esc(r.catalogFile)} — ${r.catalogSize.toLocaleString('en-US')} usable TLEs,
      ${r.sampled.toLocaleString('en-US')} sampled, ${r.commonSats.toLocaleString('en-US')} propagated by both builds ·
      times since epoch: ${r.tsinceMin.join(', ')} min</p>
    <p class="meta">Catalog ephemeris types: ${esc(JSON.stringify(r.ephemTypeCounts))}</p>
    ${r.enginesSkipped.length ? `<p class="note">Skipped engines: ${esc(r.enginesSkipped.join(', '))}.</p>` : ''}
  </header>

  <div class="tiles">${tiles}</div>

  <section class="card">
    <h2>Position delta between the two builds</h2>
    <p class="subtitle">Largest |Δ component| (km) for the same TLE, classic <code>Sgp4Prop.wasm</code> vs <code>Sgp4Prop.xp.wasm</code>, split by orbit regime</p>
    <div class="table-wrap">
    <table>
      <thead><tr><th>Group</th><th class="num">n</th><th class="num">max</th><th class="num">p99</th><th class="num">p95</th><th class="num">median</th><th class="num">mean</th></tr></thead>
      <tbody>
        ${statRow('Overall', r.overall)}
        ${statRow('Near-Earth (SGP4)', r.nearEarth)}
        ${statRow('Deep-space (SDP4)', r.deepSpace)}
        ${statRow('Velocity (km/s)', r.velOverall)}
        ${statRow('classic vs pure-TS', r.classicVsTs)}
        ${statRow('XP vs pure-TS', r.xpVsTs)}
      </tbody>
    </table>
    </div>
  </section>

  <section class="card">
    <h2>Ephemeris-type handling — can the XP build do both?</h2>
    <p class="subtitle">Each representative fed as its real type-0 TLE and as a synthesized type-4 variant (ephemeris digit flipped, checksum repaired). Cells show where each build stopped.</p>
    <div class="table-wrap">
    <table>
      <thead><tr>
        <th>NORAD</th><th>Name</th><th>Regime</th>
        <th>type-0 classic</th><th>type-0 XP</th><th>type-4 classic</th><th>type-4 XP</th>
        <th class="num">Δ classic/XP (km)</th><th class="num">XP t0 vs t4 (km)</th>
      </tr></thead>
      <tbody>${r.probes.map(probeRow).join('')}</tbody>
    </table>
    </div>
    <p class="note">${probeConclusion}</p>
  </section>

  <section class="card">
    <h2>Worst offenders</h2>
    <p class="subtitle">Largest classic-vs-XP position deltas across all satellites and times</p>
    <div class="table-wrap">
    <table>
      <thead><tr><th>NORAD</th><th>Name</th><th class="num">t since epoch (min)</th><th>regime</th><th class="num">Δpos (km)</th><th class="num">Δvel (km/s)</th></tr></thead>
      <tbody>${r.worstOffenders.map((w) => `
        <tr><td>${esc(w.noradId)}</td><td>${esc((w.name || '').slice(0, 30))}</td><td class="num">${w.tsince}</td>
        <td>${w.isDeepSpace ? 'deep-space' : 'near-Earth'}</td><td class="num">${fmtKm(w.posDelta)}</td><td class="num">${fmtKm(w.velDelta)}</td></tr>`).join('')}</tbody>
    </table>
    </div>
  </section>
</main>
</body>
</html>
`;
};

/** Plain-language read of the probe rows for the report footer. */
const describeProbe = (r: ParityReport): string => {
  const xpDoesType0 = r.probes.every((p) => isOk(p.type0.xp));
  const xpDoesType4 = r.probes.some((p) => isOk(p.type4.xp));
  const classicRejectsType4 = r.probes.some((p) => !isOk(p.type4.classic));
  const xpDiverges = r.probes.some((p) => (p.xpType0VsType4Km ?? 0) > 0.001);

  const parts: string[] = [];

  parts.push(xpDoesType0
    ? 'The XP build propagates classic type-0 TLEs and matches the classic build on them.'
    : 'The XP build did NOT cleanly propagate every classic type-0 TLE.');
  parts.push(xpDoesType4
    ? 'It also accepts type-4-flagged input'
    : 'It rejected the synthesized type-4 input');

  let tail = '.';

  if (xpDiverges) {
    tail = ', producing a different state than the type-0 elements (its extended model responds to the ephemeris type).';
  } else if (xpDoesType4) {
    tail = ', producing the same state as type-0 (the flipped flag alone did not change the physics).';
  }
  parts.push(tail);
  parts.push(classicRejectsType4
    ? ' The classic build rejects type-4 input.'
    : ' The classic build also accepted the type-4 input.');

  return parts.join('');
};
