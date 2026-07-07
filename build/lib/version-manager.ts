// src/scripts/utils/versionManager.ts
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle } from './build-error';
import { FileSystemManager } from './filesystem-manager';

/**
 * Manages version information for the build
 */
export class VersionManager {
  private readonly fileManager: FileSystemManager;

  constructor(fileManager: FileSystemManager) {
    this.fileManager = fileManager;
  }

  /**
   * Updates version references (e.g. README badge) from package.json
   * @param packageJsonPath Path to package.json
   */
  public updateVersionReferences(packageJsonPath: string): void {
    try {
      logWithStyle('Updating version information', ConsoleStyles.DEBUG);

      const version = this.readVersionFromPackageJson_(packageJsonPath);

      this.updateReadmeVersion_(version);
      this.updateCitationVersion_(version);

      logWithStyle(`Version ${version} has been set`, ConsoleStyles.DEBUG);
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      throw new BuildError(
        `Failed to update version references: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_OPERATION,
      );
    }
  }

  /**
   * Reads version from package.json file
   */
  private readVersionFromPackageJson_(packageJsonPath: string): string {
    try {
      const packageJsonContent = this.fileManager.readFile(packageJsonPath);
      const packageJson = JSON.parse(packageJsonContent);

      if (!packageJson.version) {
        throw new BuildError(
          'Package.json does not contain a version property',
          ErrorCodes.FILE_OPERATION,
        );
      }

      return packageJson.version;
    } catch (error) {
      if (error instanceof BuildError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new BuildError(
          `package.json contains invalid JSON: ${error.message}`,
          ErrorCodes.FILE_OPERATION,
        );
      }
      throw new BuildError(
        `Failed to read version from package.json: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_OPERATION,
      );
    }
  }

  /**
   * Patches the service worker cache name with the current version.
   * Must be called after static files are copied to dist.
   */
  public updateServiceWorkerVersion(packageJsonPath: string): void {
    const version = this.readVersionFromPackageJson_(packageJsonPath);
    const swPath = './dist/serviceWorker.js';
    const swContent = this.fileManager.readFile(swPath);
    const buildId = `${version}-${Date.now()}`;
    const updated = swContent
      .replace(
        /currentCacheName = 'KeepTrack-v[^']*'/u,
        `currentCacheName = 'KeepTrack-v${version}'`,
      )
      .replace(
        /BUILD_ID = '[^']*'/u,
        `BUILD_ID = '${buildId}'`,
      );

    this.fileManager.writeFile(swPath, updated);
    logWithStyle(`Updated service worker (cache: KeepTrack-v${version}, build: ${buildId})`, ConsoleStyles.DEBUG);
  }

  /**
   * Updates the version badge in README.md
   */
  private updateReadmeVersion_(version: string): void {
    const readmePath = 'README.md';
    const readmeContent = this.fileManager.readFile(readmePath);

    const updatedReadme = readmeContent.replace(
      /!\[Latest Version\]\(https:\/\/img\.shields\.io\/badge\/version-[^-]+-/gu,
      `![Latest Version](https://img.shields.io/badge/version-${version}-`,
    );

    this.fileManager.writeFile(readmePath, updatedReadme);
    logWithStyle(`Updated version in README.md to ${version}`, ConsoleStyles.DEBUG);
  }

  /**
   * Updates the version and release date in CITATION.cff
   */
  private updateCitationVersion_(version: string): void {
    const citationPath = 'CITATION.cff';

    if (!this.fileManager.fileExists(citationPath)) {
      return;
    }

    const citationContent = this.fileManager.readFile(citationPath);
    const currentVersion = (/^version:\s*(.*)$/mu).exec(citationContent)?.[1]?.trim();

    // Nothing to do if the version already matches. Avoids rewriting date-released
    // on every build and the resulting working-tree churn.
    if (currentVersion === version) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updatedCitation = citationContent
      .replace(/^version:.*$/mu, `version: ${version}`)
      .replace(/^date-released:.*$/mu, `date-released: ${today}`);

    this.fileManager.writeFile(citationPath, updatedCitation);
    logWithStyle(`Updated version in CITATION.cff to ${version} (${today})`, ConsoleStyles.SUCCESS);
  }
}
