# Build System Documentation

This directory contains the build system for KeepTrack.space, which uses **Rspack** as the bundler.

## Directory Structure

```
build/
├── lib/                      # Core build modules
│   ├── build-constants.ts   # Build configuration constants
│   ├── build-error.ts       # Error handling utilities
│   ├── build-stats.ts       # Build performance tracking
│   ├── build-validator.ts   # Configuration validation
│   ├── config-manager.ts    # Configuration loading
│   ├── filesystem-manager.ts # File operations
│   ├── plugin-manager.ts    # Plugin path management
│   └── version-manager.ts   # Version file generation
├── utils/                    # Build utilities
│   ├── generate-translation-json.ts
│   ├── generate-translation-keys.ts
│   ├── create-test-file.ts
│   ├── open-file.ts
│   └── open-lcov.ts
├── mock/                     # Test mock files
│   ├── fileMock.js
│   └── styleMock.js
├── build-manager.ts         # Main build orchestrator
├── rspack-manager.ts        # Rspack configuration
├── generate-translation.ts  # Translation file generator
├── get-submodules.ts        # Git submodule management
└── set-env.ts              # Environment file switcher
```

## Key Components

### build-manager.ts
The main entry point for the build process. Orchestrates all build steps including:
- Environment setup
- Configuration validation
- File copying
- Plugin configuration
- Version management
- Rspack compilation

### rspack-manager.ts
Manages Rspack bundler configuration and creates separate configurations for:
- **Main Application** - Primary app bundle with code splitting
- **Web Workers** - Background computation workers
- **Auth** - Authentication callback (Pro builds only)

### lib/build-stats.ts
Tracks build performance metrics:
- Build duration
- Bundle sizes
- Error/warning counts
- Asset analysis

Provides formatted console output with:
- Color-coded status messages
- Grouped asset listings (JS, CSS, HTML, other)
- Size analysis
- Performance metrics

### lib/build-validator.ts
Validates build configuration before starting:
- Checks required files exist
- Validates configuration values
- Verifies dependencies
- Pro build environment validation

### lib/build-constants.ts
Centralized constants for:
- Build modes
- Directory paths
- Entry points
- File extensions
- Output patterns
- Watch configuration
- Performance thresholds

## Build Modes

### Development
- Source maps enabled (`source-map`)
- No minification
- Caching enabled
- Fast rebuilds

### Production
- Minification with SWC (JavaScript) and Lightning CSS
- No source maps (configurable)
- Optimized bundles
- Content hash in filenames for cache busting

### None
- Minimal processing
- No optimizations

## Usage

### Standard Build
```bash
npm run build
```
Builds for production with optimizations.

### Development Build
```bash
npm run build:dev
```
Builds for development with source maps and no minification.

### Watch Mode
```bash
npm run build:watch
```
Runs development build in watch mode with auto-rebuilding on file changes.

## Configuration

### Environment Variables

Create a `.env` file (or use `.env.example` as template):

```env
# Build Mode
MODE=development|production|none

# Pro Features
IS_PRO=true|false
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Custom Paths (optional)
STYLE_CSS_PATH=public/css/style.css
LOADING_SCREEN_CSS_PATH=public/css/loading-screen.css
TEXT_LOGO_PATH=public/img/logo.png
PRIMARY_LOGO_PATH=public/img/logo-primary.png
SECONDARY_LOGO_PATH=public/img/logo-secondary.png
FAVICON_PATH=public/img/favicons/favicon.ico
SETTINGS_PATH=public/settings/settingsOverride.js
```

### Command Line Arguments

```bash
# Build with specific mode
npx tsx ./build/build-manager.ts production

# Build with watch mode
npx tsx ./build/build-manager.ts development --watch
```

## Features

### Performance Tracking
- Automatic build time measurement
- Bundle size analysis
- Asset categorization and reporting
- Performance threshold warnings

### Validation
- Pre-build configuration validation
- Required file checks
- Dependency verification
- Pro build environment validation

### Error Handling
- Custom error types with error codes
- Colored console output
- Detailed error messages
- Graceful degradation for optional features

### Logging
- Standardized logging system
- Color-coded output (DEBUG, INFO, WARNING, ERROR, SUCCESS)
- Detailed build steps
- Progress indicators

### File Management
- Automatic directory preparation
- Resource file copying
- Locale file merging
- Plugin path management

## Development

### Adding New Features

1. **New Build Constants**: Add to `lib/build-constants.ts`
2. **New Utilities**: Add to `lib/` directory
3. **Build Steps**: Update `build-manager.ts`
4. **Rspack Configuration**: Update `rspack-manager.ts`

### Error Codes

Defined in `lib/build-error.ts`:
- `INVALID_MODE` - Invalid build mode specified
- `FILE_OPERATION` - File system operation failed
- `COMPILER_CREATION` - Rspack compiler creation failed
- `PLUGIN_CONFIG` - Plugin configuration error
- `ENV_CONFIG` - Environment configuration error
- `FILE_NOT_FOUND` - Required file not found

### Plugin Management

Plugins are managed in `lib/plugin-manager.ts`. To add a new Pro plugin:

1. Add entry to `pluginPaths` object in plugin-manager.ts
2. Specify both `openSourcePath` and `proPath`
3. Plugin paths are automatically swapped based on `IS_PRO` flag

Example:
```typescript
'my-plugin': {
  openSourcePath: '../plugins/my-plugin/my-plugin',
  proPath: '../plugins-pro/my-plugin/my-plugin',
}
```

## Build Output

The build generates the following structure:

```
dist/
├── index.html              # Main HTML file
├── js/
│   ├── main.[hash].js     # Main application bundle
│   ├── positionCruncher.js # Position calculation worker
│   └── orbitCruncher.js   # Orbit calculation worker
├── auth/                   # Auth files (Pro only)
│   ├── callback.html
│   └── popup-callback.[hash].js
├── img/                    # Images
├── data/                   # Data files
├── meshes/                 # 3D meshes
├── textures/               # Textures
└── [other resources]       # Additional resources
```

## Performance Optimization

### Caching Strategy
- Development: Cache enabled for faster rebuilds
- Production: Cache disabled for clean builds

### Code Splitting
- Main application code
- Separate Web Worker bundles
- Dynamic imports for large dependencies

### Minification
- JavaScript: SWC minifier (faster than Terser)
- CSS: Lightning CSS minifier (faster than cssnano)

### Watch Mode Optimization
- Aggregate timeout: 300ms
- Poll interval: 1000ms
- Ignored patterns: node_modules

## Troubleshooting

### Common Issues

**Build fails with "File not found"**
- Check that all required files exist
- Run build validator: Configuration is validated automatically

**Slow build times**
- Use development mode for faster builds
- Enable watch mode to avoid full rebuilds
- Check bundle size output for large dependencies

**Pro features not working**
- Verify `IS_PRO=true` in `.env`
- Check that `src/plugins-pro` submodule exists
- Verify Supabase credentials are set

### Debug Mode

Enable debug logging by checking console output. The build system uses color-coded messages:
- 🟦 **Blue (DEBUG)**: Detailed debug information
- 🟦 **Cyan (INFO)**: General information
- 🟨 **Yellow (WARNING)**: Warnings
- 🟥 **Red (ERROR)**: Errors
- 🟩 **Green (SUCCESS)**: Success messages

## Migration Guide

### From Webpack to Rspack

Rspack is largely compatible with Webpack, but some differences:
- Renamed `webpack-manager.ts` to `rspack-manager.ts` for clarity
- Using `@rspack/core` instead of `webpack`
- Faster builds with Rust-based processing
- Improved HMR (Hot Module Replacement)

## Contributing

When contributing to the build system:

1. **Use constants**: Add new paths/values to `build-constants.ts`
2. **Standardized logging**: Use `logWithStyle()` from `build-error.ts`
3. **Error handling**: Use `BuildError` class with appropriate error codes
4. **Type safety**: Ensure all new code is properly typed
5. **Documentation**: Update this README for significant changes

## Testing

Test the build process:

```bash
# Clean build
rm -rf dist && npm run build

# Development build
npm run build:dev

# Watch mode
npm run build:watch

# With different environment
npm run setenv pro && npm run build
```

## Performance Metrics

The build system tracks and reports:
- Total build duration
- Asset sizes (by type)
- Number of errors/warnings
- Performance thresholds:
  - Fast: < 10 seconds
  - Normal: 10-30 seconds
  - Slow: 30-60 seconds
  - Very slow: > 60 seconds

## Future Improvements

Potential enhancements:
- [ ] Bundle analyzer integration
- [ ] Build cache optimization
- [ ] Parallel builds for multiple targets
- [ ] Enhanced source map options
- [ ] Build artifacts compression
- [ ] CDN upload automation
- [ ] Incremental builds optimization
