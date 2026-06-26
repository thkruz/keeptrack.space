import { FileSystemManager } from './lib/filesystem-manager';
import { VersionManager } from './lib/version-manager';

/**
 * Standalone entry point that syncs version references (e.g. the README badge)
 * with the current `package.json` version.
 *
 * Wired into the npm `version` lifecycle hook so the README is updated in the
 * same commit as the `package.json` bump, rather than waiting for the next build.
 */
const fileManager = new FileSystemManager(import.meta.url);
const versionManager = new VersionManager(fileManager);

versionManager.updateVersionReferences('./package.json');
