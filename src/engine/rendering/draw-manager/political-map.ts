import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';

/** One country from the slimmed Natural Earth data (see scripts/slim-natural-earth.ts). */
export interface PoliticalCountry {
  name: string;
  /** Localized names keyed by 2-letter app locale; missing locales fall back to name. */
  names?: Record<string, string>;
  labelLon: number;
  labelLat: number;
  /** Natural Earth LABELRANK: 2 (major) .. 10 (minor). */
  labelRank: number;
  /** Natural Earth MIN_LABEL zoom at which the label should appear. */
  minLabel: number;
  /** Flattened [lon0, lat0, lon1, lat1, ...] per polygon ring. */
  rings: Float32Array[];
}

interface RasterJob {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  countryIdx: number;
  ringIdx: number;
}

interface SlimFeature {
  properties: {
    name?: string;
    names?: Record<string, string>;
    labelX?: number;
    labelY?: number;
    labelRank?: number;
    minLabel?: number;
  };
  geometry: { type: string; coordinates: number[][][] | number[][][][] } | null;
}

/** Segments lying entirely on the antimeridian or the south-pole edge are dataset
 * artifacts (polygon splitting), not real borders. */
const EDGE_LON = 179.99;
const EDGE_LAT = -89.99;

/** Vertex budget per rasterization slice — keeps each frame's share of the work at a few ms. */
const POINTS_PER_SLICE = 60_000;

/** Equirect canvas size. 4096x2048 fully resolves the 50m dataset's detail. */
const CANVAS_HEIGHT = 2048;

/**
 * Political country borders rasterized at runtime from Natural Earth 50m GeoJSON
 * onto an equirectangular canvas, uploaded as the Earth shader's political-map
 * texture (additively blended, so borders are white-on-transparent).
 *
 * A single dataset is used deliberately: the earlier 110m/50m/10m auto-LOD
 * design was dropped because the generalization levels are not coincident (a
 * LOD swap visibly shifted borders) and the 10m fetch/parse/upload stalled the
 * main thread mid-zoom. The 50m data is fetched once, and rasterization is
 * sliced across frames (POINTS_PER_SLICE vertices per update) so it never
 * stalls the render loop.
 *
 * The parsed country list also feeds {@link CountryLabelManager} (label anchor
 * points + localized names), and {@link getEquirectCanvas} lets 2D consumers
 * (the Pro stereo map) reuse the same rasterization instead of a PNG.
 */
export class PoliticalMap {
  private static instance_: PoliticalMap | null = null;

  private countries_: PoliticalCountry[] | null = null;
  private isFetching_ = false;
  private isFailed_ = false;
  private texture_: WebGLTexture | null = null;
  /** Fully rasterized equirect canvas, kept for 2D consumers (stereo map). */
  private canvas_: HTMLCanvasElement | OffscreenCanvas | null = null;
  private job_: RasterJob | null = null;
  private gl_: WebGL2RenderingContext | null = null;

  static getInstance(): PoliticalMap {
    PoliticalMap.instance_ ??= new PoliticalMap();

    return PoliticalMap.instance_;
  }

  /** Borders texture, or null until the first rasterization completes. */
  get texture(): WebGLTexture | null {
    return this.texture_;
  }

  /** Label data for CountryLabelManager, or null until the dataset is loaded. */
  get labelCountries(): PoliticalCountry[] | null {
    return this.countries_;
  }

  /** Bumped when {@link labelCountries} becomes available, so consumers can rebuild. */
  labelRevision = 0;

  /**
   * Per-frame driver: kicks off the fetch on first use and advances any
   * in-progress raster job by one slice. Cheap no-op once the texture exists.
   */
  update(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;

    if (this.texture_ || this.isFailed_) {
      return;
    }

    if (!this.countries_) {
      this.fetchDataset_().catch(() => {
        // Errors already recorded in fetchDataset_
      });

      return;
    }

    this.job_ ??= this.createRasterJob_();
    if (!this.job_) {
      this.isFailed_ = true;

      return;
    }

    this.advanceRaster_();
  }

  /**
   * Fully rasterized equirect borders canvas for 2D consumers. Rasterizes
   * synchronously once the dataset is loaded (a few tens of ms). Resolves null
   * in environments without 2D canvas support.
   */
  async getEquirectCanvas(): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
    if (this.canvas_) {
      return this.canvas_;
    }

    if (!this.countries_) {
      await this.fetchDataset_();
    }

    const countries = this.countries_;

    if (!countries) {
      return null;
    }

    const job = this.createRasterJob_();

    if (!job) {
      return null;
    }

    while (job.countryIdx < countries.length) {
      PoliticalMap.rasterizeSlice_(job, countries, Number.POSITIVE_INFINITY);
    }
    this.canvas_ = job.canvas;

    return job.canvas;
  }

  private async fetchDataset_(): Promise<void> {
    if (this.isFetching_ || this.countries_ || this.isFailed_) {
      return;
    }
    this.isFetching_ = true;

    try {
      const url = `${settingsManager.installDirectory}data/ne_50m_admin_0_countries.geojson`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const geojson = (await resp.json()) as { features: SlimFeature[] };

      this.countries_ = PoliticalMap.parseFeatures_(geojson.features);
      this.labelRevision++;
    } catch (err) {
      this.isFailed_ = true;
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.politicalMapLoadFailed'), err);
    } finally {
      this.isFetching_ = false;
    }
  }

  private static parseFeatures_(features: SlimFeature[]): PoliticalCountry[] {
    const countries: PoliticalCountry[] = [];

    for (const feature of features) {
      if (!feature.geometry) {
        continue;
      }

      const { type, coordinates } = feature.geometry;
      const polygons = type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
      const rings: Float32Array[] = [];

      for (const polygon of polygons) {
        for (const ring of polygon) {
          const flat = new Float32Array(ring.length * 2);

          for (let i = 0; i < ring.length; i++) {
            flat[i * 2] = ring[i][0];
            flat[i * 2 + 1] = ring[i][1];
          }
          rings.push(flat);
        }
      }

      const p = feature.properties;

      countries.push({
        name: p.name ?? '',
        names: p.names,
        labelLon: p.labelX ?? 0,
        labelLat: p.labelY ?? 0,
        labelRank: p.labelRank ?? 10,
        minLabel: p.minLabel ?? 5,
        rings,
      });
    }

    return countries;
  }

  private createRasterJob_(): RasterJob | null {
    const height = CANVAS_HEIGHT;
    const width = height * 2;
    const maxSize = this.gl_?.getParameter(this.gl_.MAX_TEXTURE_SIZE) as number | undefined;

    if (maxSize && width > maxSize) {
      return null;
    }

    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : (null as HTMLCanvasElement | null);
    const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D | null;

    if (!canvas || !ctx) {
      return null;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    return { canvas, ctx, countryIdx: 0, ringIdx: 0 };
  }

  private advanceRaster_(): void {
    const job = this.job_!;
    const countries = this.countries_!;

    PoliticalMap.rasterizeSlice_(job, countries, POINTS_PER_SLICE);

    if (job.countryIdx >= countries.length) {
      this.canvas_ = job.canvas;
      this.uploadTexture_(job);
      this.job_ = null;
    }
  }

  /** Strokes rings into the job's canvas until the vertex budget is exhausted. */
  private static rasterizeSlice_(job: RasterJob, countries: PoliticalCountry[], budget: number): void {
    const { ctx, canvas } = job;
    const w = canvas.width;
    const h = canvas.height;
    const xOf = (lon: number): number => ((lon + 180) / 360) * w;
    const yOf = (lat: number): number => ((90 - lat) / 180) * h;

    let spent = 0;

    ctx.beginPath();
    while (job.countryIdx < countries.length && spent < budget) {
      const rings = countries[job.countryIdx].rings;

      while (job.ringIdx < rings.length && spent < budget) {
        const ring = rings[job.ringIdx];
        let penDown = false;

        for (let i = 2; i < ring.length; i += 2) {
          const lonA = ring[i - 2];
          const latA = ring[i - 1];
          const lonB = ring[i];
          const latB = ring[i + 1];

          // Skip polygon-splitting artifacts along the antimeridian / south pole.
          if ((Math.abs(lonA) > EDGE_LON && Math.abs(lonB) > EDGE_LON) || (latA < EDGE_LAT && latB < EDGE_LAT)) {
            penDown = false;
            continue;
          }

          if (!penDown) {
            ctx.moveTo(xOf(lonA), yOf(latA));
            penDown = true;
          }
          ctx.lineTo(xOf(lonB), yOf(latB));
        }

        spent += ring.length / 2;
        job.ringIdx++;
      }

      if (job.ringIdx >= rings.length) {
        job.countryIdx++;
        job.ringIdx = 0;
      }
    }

    // Two-pass stroke: a wide faint halo under a soft core approximates a
    // Gaussian line profile. Hard 1px full-white lines shimmer during fast
    // camera motion (FXAA + trilinear mip transitions smear high-contrast
    // edges); the pre-softened profile filters stably instead.
    const coreWidth = Math.max(1.25, h / 2048);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = coreWidth * 2.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = coreWidth;
    ctx.stroke();
  }

  private uploadTexture_(job: RasterJob): void {
    const gl = this.gl_;

    if (!gl) {
      return;
    }

    const texture = gl.createTexture();

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, job.canvas as TexImageSource);

    // Power-of-2 canvas: repeat across the antimeridian, mipmap + anisotropy for stable lines.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const ext = gl.getExtension('EXT_texture_filter_anisotropic');

    if (ext) {
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
    }
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.texture_ = texture;
  }
}
