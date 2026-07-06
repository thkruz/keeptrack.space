/**
 * Generate MIRV missile-mesh variants with 2, 6, 8, and 10 reentry vehicles from
 * the hand-authored `misl3` (shroud separating, RVs revealed) and `misl4` (RVs
 * pulling away from the spent bus) reference meshes in `public/meshes/`.
 *
 * The reference meshes each carry four warheads. Rather than hand-model every
 * count, this copies the bus geometry verbatim and re-places a single warhead
 * template (a radially-symmetric cone, so uniform scale + translation keep its
 * normals valid) evenly around a ring sized to fit N vehicles on the bus deck.
 * The result is a set of meshes whose RV cluster reads out the missile's true
 * warhead load; the mesh resolver picks the nearest variant by warhead count.
 *
 * The count-4 case stays the original `misl3.obj` / `misl4.obj` (untouched).
 *
 *   npm run mirv:meshes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MESH_DIR = path.join(REPO_ROOT, 'public', 'meshes');

/** RV counts to emit as `<base>-<count>` variants (4 is the untouched original). */
const COUNTS = [2, 6, 8, 10];

interface ObjObject {
  name: string;
  lines: string[];
  vStart: number;
  vtStart: number;
  vnStart: number;
  v: number[][];
  vt: string[];
  vn: string[];
  f: string[];
  misc: string[];
}

interface VariantOptions {
  /** Outer radius (file units) the warhead cluster should fit within. */
  deckRadius: number;
  /** Lower bound on the ring radius so small counts do not collapse to a point. */
  minRing: number;
  /** Extra spacing between neighbouring warheads on the ring. */
  gap: number;
  /** Ring angular offset so an even count does not sit exactly on the axes. */
  phase: number;
  /** Per-vehicle vertical rise (file units) to read as sequential separation. */
  stagger: number;
}

/** Parse an OBJ into its objects, tracking each one's global v/vt/vn start offsets. */
function parseObj(file: string): ObjObject[] {
  const objects: ObjObject[] = [];
  let cur: ObjObject | null = null;
  let gv = 0;
  let gvt = 0;
  let gvn = 0;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
    if (line.startsWith('o ')) {
      cur = { name: line.slice(2).trim(), lines: [], vStart: gv, vtStart: gvt, vnStart: gvn, v: [], vt: [], vn: [], f: [], misc: [] };
      objects.push(cur);
      continue;
    }
    if (!cur) {
      continue;
    }
    cur.lines.push(line);
    if (line.startsWith('v ')) {
      gv++;
      cur.v.push(line.slice(2).trim().split(/\s+/u).map(Number));
    } else if (line.startsWith('vt ')) {
      gvt++;
      cur.vt.push(line.slice(3).trim());
    } else if (line.startsWith('vn ')) {
      gvn++;
      cur.vn.push(line.slice(3).trim());
    } else if (line.startsWith('f ')) {
      cur.f.push(line.slice(2).trim());
    } else {
      cur.misc.push(line);
    }
  }

  return objects;
}

const isWarhead = (o: ObjObject): boolean => (/warhead/iu).test(o.name);

function centroidXZ(vs: number[][]): [number, number, number] {
  let cx = 0;
  let cy = 0;
  let cz = 0;

  for (const v of vs) {
    cx += v[0];
    cy += v[1];
    cz += v[2];
  }

  return [cx / vs.length, cy / vs.length, cz / vs.length];
}

/** Max in-plane (x/z) distance of any vertex from the cluster axis - the warhead radius. */
function warheadRadius(vs: number[][], cx: number, cz: number): number {
  let r = 0;

  for (const v of vs) {
    r = Math.max(r, Math.hypot(v[0] - cx, v[2] - cz));
  }

  return r;
}

/** Uniform warhead scale so N vehicles of base radius rw0 pack a deck of radius Rout. */
function packScale(n: number, rw0: number, Rout: number): number {
  if (n <= 1) {
    return 1;
  }
  const ringOverWarhead = 1 / Math.sin(Math.PI / n);

  return Math.min(1, Rout / (rw0 * (ringOverWarhead + 1)));
}

/** Ring radius that spaces N warheads of scaled radius rw with the given gap. */
function ringRadius(n: number, rw: number, gap: number): number {
  if (n <= 1) {
    return 0;
  }

  return (rw + gap) / Math.sin(Math.PI / n);
}

const fmt = (n: number): string => (Object.is(n, -0) ? 0 : n).toFixed(6);

function buildWarheadCopy(tpl: ObjObject, local: number[][], scale: number, tx: number, ty: number, tz: number, index: number, offsets: { gv: number; gvt: number; gvn: number }): string[] {
  const out: string[] = [`o Warhead${String(index + 1).padStart(2, '0')}_Mesh`];

  for (const lv of local) {
    out.push(`v ${fmt(lv[0] * scale + tx)} ${fmt(lv[1] * scale + ty)} ${fmt(lv[2] * scale + tz)}`);
  }
  for (const vt of tpl.vt) {
    out.push(`vt ${vt}`);
  }
  for (const vn of tpl.vn) {
    out.push(`vn ${vn}`);
  }
  out.push(...tpl.misc);
  out.push(...tpl.lines.filter((l) => l.startsWith('usemtl')));

  // Faces reference the template's contiguous v/vt/vn blocks; shift each stream to this copy's offset.
  const dv = offsets.gv - tpl.vStart;
  const dvt = offsets.gvt - tpl.vtStart;
  const dvn = offsets.gvn - tpl.vnStart;

  for (const face of tpl.f) {
    const toks = face.split(/\s+/u).map((tok) => {
      const [vi, vti, vni] = tok.split('/');
      const nvt = vti === '' || vti === undefined ? '' : Number(vti) + dvt;
      const nvn = vni === '' || vni === undefined ? '' : Number(vni) + dvn;

      return `${Number(vi) + dv}/${nvt}/${nvn}`;
    });

    out.push(`f ${toks.join(' ')}`);
  }

  return out;
}

function generate(baseName: string, count: number, opts: VariantOptions): void {
  const objects = parseObj(path.join(MESH_DIR, `${baseName}.obj`));
  const busObjs = objects.filter((o) => !isWarhead(o));
  const warheads = objects.filter(isWarhead);
  const tpl = warheads[0];

  // Cluster axis = mean of the original warhead centroids (x/z).
  const centers = warheads.map((w) => centroidXZ(w.v));
  const clusterX = centers.reduce((s, c) => s + c[0], 0) / centers.length;
  const clusterZ = centers.reduce((s, c) => s + c[2], 0) / centers.length;
  const [tcx, tcy, tcz] = centroidXZ(tpl.v);
  const rw0 = warheadRadius(tpl.v, tcx, tcz);

  const scale = packScale(count, rw0, opts.deckRadius);
  const R = Math.max(opts.minRing, ringRadius(count, rw0 * scale, opts.gap));
  const local = tpl.v.map((v) => [v[0] - tcx, v[1] - tcy, v[2] - tcz]);

  const out: string[] = [
    `# ${baseName}-${count}: MIRV variant with ${count} reentry vehicles`,
    `# Bus geometry copied verbatim from ${baseName}.obj; warheads re-placed on a ring of ${count}`,
    `# (uniform scale ${scale.toFixed(3)}, ring radius ${R.toFixed(3)}). Generated - do not hand-edit.`,
    `# Regenerate with: npm run mirv:meshes`,
    `mtllib ${baseName}-${count}.mtl`,
  ];

  const offsets = { gv: 0, gvt: 0, gvn: 0 };

  for (const o of busObjs) {
    out.push(`o ${o.name}`, ...o.lines);
    offsets.gv += o.v.length;
    offsets.gvt += o.vt.length;
    offsets.gvn += o.vn.length;
  }

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / count + opts.phase;
    const tx = clusterX + R * Math.cos(theta);
    const tz = clusterZ + R * Math.sin(theta);
    const ty = tcy + i * opts.stagger;

    out.push(...buildWarheadCopy(tpl, local, scale, tx, ty, tz, i, offsets));
    offsets.gv += tpl.v.length;
    offsets.gvt += tpl.vt.length;
    offsets.gvn += tpl.vn.length;
  }

  fs.writeFileSync(path.join(MESH_DIR, `${baseName}-${count}.obj`), `${out.join('\n')}\n`);
  // The RV material is identical to the base mesh; copy it under the variant name.
  fs.copyFileSync(path.join(MESH_DIR, `${baseName}.mtl`), path.join(MESH_DIR, `${baseName}-${count}.mtl`));

  // eslint-disable-next-line no-console
  console.log(`wrote ${baseName}-${count}.obj (${count} RVs, scale ${scale.toFixed(3)}, ring R ${R.toFixed(3)})`);
}

// misl3: RVs revealed, packed flat on the bus deck.
for (const c of COUNTS) {
  generate('misl3', c, { deckRadius: 1.12, minRing: 0.55, gap: 0.05, phase: 0, stagger: 0 });
}
// misl4: RVs separating - wider ring, a slight height stagger to read as a fan.
for (const c of COUNTS) {
  generate('misl4', c, { deckRadius: 2.8, minRing: 1.6, gap: 0.2, phase: Math.PI / 6, stagger: 0.4 });
}
