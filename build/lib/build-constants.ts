/**
 * Build constants and configuration
 */

/**
 * Build modes
 */
export const BUILD_MODES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  NONE: 'none',
} as const;

/**
 * Build directories
 */
export const BUILD_DIRS = {
  SOURCE: 'src',
  DIST: 'dist',
  PUBLIC: 'public',
  BUILD_SCRIPTS: 'build',
  NODE_MODULES: 'node_modules',
  PLUGINS: 'src/plugins',
  PLUGINS_PRO: 'src/plugins-pro',
} as const;

/**
 * Resource directories to copy
 */
export const RESOURCE_DIRS = [
  'img/favicons',
  'img/pwa',
  'img/achievements',
  'data',
  'meshes',
  'res',
  'simulation',
  'textures',
  'tle',
] as const;

/**
 * Entry points for the build
 */
export const ENTRY_POINTS = {
  MAIN: './src/main.ts',
  POSITION_WORKER: './src/webworker/positionCruncher.ts',
  ORBIT_WORKER: './src/webworker/orbitCruncher.ts',
  AUTH_CALLBACK: './src/plugins-pro/user-account/popup-callback.ts',
} as const;

/**
 * Output file patterns
 */
export const OUTPUT_PATTERNS = {
  MAIN_JS: '[name].[contenthash].js',
  WORKER_JS: '[name].js',
  AUTH_JS: '[name].[contenthash].js',
  IMAGE: '../img/[name][ext]',
  AUDIO: '../audio/[name][ext]',
  FONT: '../fonts/[name][ext]',
  CSS: './css/[name][ext]',
} as const;

/**
 * File extensions
 */
export const FILE_EXTENSIONS = {
  TYPESCRIPT: ['.ts', '.tsx'],
  JAVASCRIPT: ['.js', '.jsx'],
  IMAGES: ['.png', '.svg', '.jpg', '.jpeg', '.gif'],
  AUDIO: ['.mp3', '.wav', '.flac'],
  FONTS: ['.woff', '.woff2', '.ttf', '.eot', '.otf'],
  CSS: ['.css'],
  LOCALE: ['.src.json'],
} as const;

/**
 * Watch mode configuration
 */
export const WATCH_CONFIG = {
  AGGREGATE_TIMEOUT: 300,
  POLL_INTERVAL: 1000,
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  ENABLED_IN_DEV: true,
  ENABLED_IN_PROD: false,
} as const;

/**
 * DevTool configurations
 */
export const DEVTOOL_CONFIG = {
  DEVELOPMENT: 'source-map',
  PRODUCTION: false,
  EVAL_SOURCE_MAP: 'eval-source-map', // Alternative for faster rebuilds
} as const;

/**
 * Size thresholds for warnings (in bytes)
 */
export const SIZE_THRESHOLDS = {
  ASSET_WARNING: 250 * 1024, // 250 KB
  ASSET_ERROR: 500 * 1024,   // 500 KB
  ENTRY_WARNING: 1024 * 1024, // 1 MB
  ENTRY_ERROR: 2 * 1024 * 1024, // 2 MB
} as const;

/**
 * Default paths
 */
export const DEFAULT_PATHS = {
  ENV_FILE: '.env',
  ENV_EXAMPLE: '.env.example',
  PACKAGE_JSON: 'package.json',
  TSCONFIG: 'tsconfig.build.json',
  VERSION_FILE: 'src/settings/version.js',
  README: 'README.md',
  INDEX_HTML: 'public/index.html',
  AUTH_CALLBACK_HTML: 'src/plugins-pro/user-account/callback.html',
} as const;

/**
 * Plugin configuration
 */
export const PLUGIN_CONFIG = {
  OPTIONAL_SUBMODULES: ['src/plugins-pro'],
} as const;

/**
 * Build performance thresholds (in milliseconds)
 */
export const PERFORMANCE_THRESHOLDS = {
  FAST_BUILD: 10000,      // < 10s is fast
  NORMAL_BUILD: 30000,    // 10-30s is normal
  SLOW_BUILD: 60000,      // 30-60s is slow
  // > 60s is very slow
} as const;
