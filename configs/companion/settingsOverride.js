/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// Settings Manager Overrides — "companion" profile
//
// A chrome-less single-satellite globe for the KeepTrack Companion Android app.
// The companion bundles this build into its assets and loads it in a same-origin
// iframe mounted at /embed/, scripting the engine directly via keepTrackApi
// (selection, camera modes, sim time). Differences from the embed profile:
// programmatic selection is ENABLED, meshes/clouds/atmosphere/aurora are ON for
// visual fidelity, and the PWA service worker is disabled (it must never install
// inside the host app's WebView origin).
const settingsOverride = {
  /*
   * isStrictPluginList makes this map an exhaustive allowlist: every plugin not
   * listed here (including ones added to the manifest later) is force-disabled.
   * Always-enabled infra plugins (e.g. SelectSatManager) are exempt and stay on.
   */
  plugins: {
    // Scene-only plugins for globe fidelity — no menus, no UI surface.
    EarthAtmosphere: {
      enabled: true,
    },
    AuroraPlugin: {
      enabled: true,
    },
    /*
     * Background starfield. Without it the sky past the Milky Way band is dead
     * black and the globe reads as broken. StarsPlugin is a data plugin that
     * injects the ~9K Harvard-Revised catalog as static dots on the star sphere
     * during beforeFilterTLEDatabase — which still fires under noCatalogOnLoad
     * (keeptrack.ts routes an empty boot through CatalogLoader.parse({}), whose
     * comment is "still adds stars"). This is the maintained star path; the OSS
     * isDisableStars catalog stays off (its ra/dec are hours/degrees, mis-cast as
     * radians → scrambled positions).
     *
     * NOT selectable: the profile ships isDisableGpuPicking + isDisableSelectSat,
     * so stars can't be hovered or tapped (and the bridge only ever selects its
     * own analyst slot). The constellation toggle/labels never surface either —
     * the bottom menu is disabled and hover-to-draw needs the picking pass.
     *
     * Star catalog + constellations are BUNDLED into this build (see dataSources
     * below and the companion's embed-extras/ → /embed/data/), so the starfield
     * renders fully offline inside the WebView instead of relying on a CORS-blocked
     * r2 fetch. A silent empty-set fallback still guards a missing file.
     */
    StarsPlugin: {
      enabled: true,
    },
  },
  isStrictPluginList: true,

  /*
   * Stars + constellations are BUNDLED into this build (companion embed-extras/ →
   * /embed/data/) instead of fetched from r2.keeptrack.space. The WebView origin
   * (https://localhost) can't reach r2 — cross-origin fetch is CORS-blocked — and the
   * globe must render its starfield fully offline. Point the StarsPlugin loaders
   * straight at the local copies so there's no doomed r2 request or console error;
   * dataSources deep-merges, so covariance/orgs keep their upstream URLs.
   */
  dataSources: {
    stars: '/embed/data/star-catalog.json',
    constellations: '/embed/data/constellations.json',
  },

  /*
   * NO CATALOG: the companion app owns the catalog (search, passes, map run on
   * the phone). The globe tracks exactly ONE satellite — the host injects its
   * TLE into a reserved analyst slot at runtime (catalogManager.addAnalystSat /
   * sendSatEdit via the embed bridge) and swaps the elements on re-selection.
   * No 20 MB download, no 46k-object cruncher/dot/orbit load, fully offline.
   */
  noCatalogOnLoad: true,
  maxAnalystSats: 8,
  maxFieldOfViewMarkers: 1,
  maxMissiles: 1,

  // The companion serves this build from /embed/ inside its own origin (Vite dev
  // server and the Capacitor https://localhost origin alike). Texture/mesh/data
  // fetches all derive from this, and host-based auto-detection would pick '/'.
  installDirectory: '/embed/',
  isDisableServiceWorker: true,
  // No audio ships in this build (sync-embed prunes audio/); without this the
  // SoundManager 404s ~40 clips at boot and floods the console. The app is silent.
  isDisableSounds: true,
  // The WebView origin is https://localhost — without this the telemetry consent
  // shortcut for localhost dev would load GA inside the app. Never track in-app.
  isDisableTelemetry: true,

  /*
   * Selection is APP-OWNED: the user must not be able to deselect (or select) by
   * tapping the globe — empty-space taps route through selectSat(-1), which this
   * flag turns into a no-op. The embed bridge flips it off around its OWN
   * selectSat calls, so programmatic tracking still works.
   */
  isDisableSelectSat: true,

  /*
   * No tap-to-select here (selection is programmatic), so the per-frame GPU
   * picking pass is pure waste — AND on mobile it renders unscissored full-screen,
   * which corrupts the visible scene (atmosphere vanishes, orbit line z-fights
   * through the Earth). Skipping it fixes both and saves a full-screen pass.
   */
  isDisableGpuPicking: true,
  // Pro scene plugins above must work without a signed-in session.
  isDisableLoginGate: true,

  isShowSecondaryLogo: false,
  isEnableJscCatalog: false,
  isShowSplashScreen: false,
  isDisableSensors: true,
  isDisableLaunchSites: true,
  isDisableKeyboard: true,
  isAllowRightClick: false,
  isShowLoadingHints: false,
  isBlockPersistence: true,
  isDisableOnboarding: true,
  isDisableBottomMenu: true,
  isEmbedMode: true,
  isDisableToasts: true,
  isDisableUrlBar: true,
  isAutoStart: true,

  /*
   * Force DESKTOP mode: this build runs inside an Android WebView, so the
   * user-agent sniff (MobileManager.checkIfMobileDevice) would otherwise flag it
   * mobile and apply the mobile layout/camera/FOV tuning. The companion drives
   * the engine programmatically as a chrome-less globe, so the phone heuristics
   * only get in the way — treat it as a desktop client.
   */
  // isForceMobileMode: false,

  // Globe look: visuals are a competitive feature — full Pro earth (day/night
  // blend + spec + bump), clouds, atmosphere, aurora, textured sun, and the
  // Moon. Skybox/planets/milky way stay off (GPU budget; revisit on device).
  //
  // The engine's adaptive ladder silently sheds godrays → aurora → atmosphere →
  // moon below 30 fps — on-device that read as "graphics settings not loading".
  // Visuals ARE the product here, so the ladder is off; thermals are the
  // WP-E6 on-device call.
  isDisablePerformanceDowngrade: true,
  // Render at native resolution (auto = min(devicePixelRatio, 2)) — the default
  // CSS-pixel canvas upscales ~3× on phones and aliases every thin line.
  canvasPixelRatio: 0,
  // No canvas-capture UI ships in this profile (Screenshot/ScreenRecorder are not
  // in the allowlist), so skip preserveDrawingBuffer: with it on, the compositor
  // must COPY the drawing buffer every frame instead of swapping it, and mobile
  // tile-based GPUs can't discard tile memory — a per-frame bandwidth tax.
  isPreserveDrawingBuffer: false,
  /*
   * Earth sphere tessellation, 128 from the engine's 256 default. The sphere is
   * rasterized several times per frame (surface, atmosphere shell, and formerly
   * occlusion/picking) and 256² ≈ 131k triangles per pass was pure vertex-stage
   * waste on phone GPUs — at a phone-pane disc size the 128² silhouette error is
   * well under a pixel, and surface detail comes from the bump map, not geometry.
   */
  earthNumLatSegs: 128,
  earthNumLonSegs: 128,
  /*
   * 2k textures (from 4k): at the tracking-shot framing the full disc spans
   * ~1000 physical px, so 2k already delivers ~1 texel per pixel — 4k only pays
   * off deep into a pinch-zoom, while costing 4× the memory bandwidth per fetch
   * on every one of the surface shader's five samplers. Mobile texture caches
   * thrash long before desktop ones do; this is the cheap half of the fix for
   * the rotation stutter (the other half is the engine's single-draw earth).
   * Bump used to be the exception (its upstream tiers were 256/4k/8k only, so a
   * '2k' request decode-failed via the SPA fallback and silently disabled bump);
   * 1k/2k earthbump assets were generated 2026-07-12, so every earth channel now
   * sits at a consistent 2k.
   */
  earthDayTextureQuality: '2k',
  earthNightTextureQuality: '2k',
  isDrawNightAsDay: false,
  // Brighten the Earth's night (city-lights) texture so the dark limb is readable on
  // dim mobile screens. 1 = stock brightness, >1 gains it up. Companion-only.
  earthNightBrightness: 2.5,
  earthSpecTextureQuality: '2k',
  isDrawSpecMap: true,
  earthBumpTextureQuality: '2k',
  isDrawBumpMap: true,
  earthCloudTextureQuality: '2k',
  isDrawCloudsMap: true,
  earthPoliticalTextureQuality: 'off',
  isDrawPoliticalMap: false,
  earthTextureStyle: 'earthmap', // 'earthmap' or 'flat'
  isDrawAtmosphere: 1,
  isDrawAurora: true,
  // Soft pulsing glow around the tracked satellite in the globe (non-ride-along) view,
  // mirroring the 2D map's live marker. The "you are here" observer marker is fed at
  // runtime via the embed bridge (settingsManager.observerMarkerLla).
  isDrawSelectionGlow: true,
  isDrawSun: true,
  isDrawMilkyWay: true,
  /*
   * Godrays OFF — the single biggest GPU cut for the phone. The godrays chain is
   * three extra passes at full canvas resolution (sun into an offscreen FBO, a
   * second full earth-sphere "occlusion" draw into it, then a 40-samples-per-pixel
   * radial-march composite back to screen) plus two mid-frame framebuffer
   * switches, which force tile flushes on mobile GPUs. This mirrors the engine's
   * own first performance-downgrade step: the sun stays, drawn directly to screen
   * as a textured disc (isUseSunTexture) at the ladder's tuned 1.65 size.
   */
  isDisableGodrays: true,
  isUseSunTexture: true,
  sizeOfSun: 1.65,
  isDisableMoon: false,
  // Milky Way ON: the skybox sphere IS the Milky Way carrier — with isDisableSkybox
  // true the engine never even initialises it (scene.ts) and its render early-returns
  // (skybox-sphere.ts), so isDrawMilkyWay above is inert. Requires the companion sync
  // to ship textures/skybox4k.jpg (scripts/sync-embed.mjs prunes 'skybox*' by default).
  isDisableSkybox: false,
  isDisablePlanets: true,

  // Orbit-cam mode (camera fixed to the satellite) renders the 3D mesh; the
  // companion's sync script prunes dist/meshes to a curated set and missing
  // meshes degrade to the standard dot (mesh loads are per-name and fail soft).
  noMeshManager: false,

  initZoomLevel: 0.87,
  // The tracking view never needs to zoom out past the GEO belt (42 164 km ring
  // + margin to see it in context).
  maxZoomDistance: 55_000,
  /*
   * Far clipping plane. The binding constraint is the STARFIELD: StarsPlugin
   * (enabled above) draws stars through the normal dots pipeline with REAL depth
   * at STAR_DISTANCE = 3.0e10 km (constants.ts, "just inside the milkyway skybox
   * sphere"). Anything past zFar is clipped, so a tighter window renders a black
   * sky with the Milky Way band alone — the band survives because the skybox is
   * depth-tricked, but the point-sprite stars are not. The far plane must clear
   * STAR_DISTANCE plus the largest camera-to-origin distance (maxZoomDistance
   * below, 5.5e4 km) — 3.2e10 km gives margin. The real-distance Sun disc
   * (1.496e8 km, godrays source) and Moon (3.844e5 km) stay comfortably inside.
   *
   * Still a ~30× cut from the engine default (1e12 km); with the logarithmic
   * depth buffer that buys ~12% more depth resolution on close geometry. (The
   * old 1.6e8 sun-inclusive window predated the starfield — it clipped every
   * star. To reclaim it we'd need scaled-distance star/sun/moon rendering, drawn
   * nearer at proportionally smaller size.)
   */
  zFar: 32_000_000_000,
  isLocalRotateEnabled: false,

  // ONE tracked dot on a phone viewport: prominent but not cartoonish.
  // Deep-merged, so the other satShader fields keep their defaults.
  satShader: {
    minSize: 4.0,
    maxAllowedSize: 18.0,
    // Stars render at exactly starMinSize px (at their 3e10 km distance baseSize≈0),
    // and the engine default (8) is hard to see on a dense phone display at native
    // resolution — bump it so the starfield reads clearly. Tune here.
    starMinSize: 12.0,
  },
};

// Expose these to the console
window.settingsOverride = settingsOverride;
