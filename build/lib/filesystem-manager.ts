// src/scripts/utils/fileSystemManager.ts
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { BuildError, ConsoleStyles, ErrorCodes, logWithStyle, tryCatchWithBuildError } from './build-error';

/**
 * Manages file system operations for the build process
 */
export class FileSystemManager {
  rootDir: string;

  /**
   * Initializes the file system manager
   * @param importMetaUrl The import.meta.url from the calling module
   */
  constructor(importMetaUrl?: string) {
    if (importMetaUrl) {
      const filename = fileURLToPath(importMetaUrl);

      this.rootDir = resolve(dirname(filename), '..');
    } else {
      this.rootDir = process.cwd();
    }

    logWithStyle(`Root directory: ${this.rootDir}`, ConsoleStyles.INFO);
  }

  /**
   * Prepares the build directory by cleaning and creating it
   * @param buildDir The build directory path
   */
  public prepareBuildDirectory(buildDir: string): void {
    const fullPath = this.resolvePath(buildDir);

    logWithStyle(`Preparing build directory: ${fullPath}`, ConsoleStyles.INFO);

    this.cleanDirectory(buildDir);
    this.createDirectory(buildDir);
  }

  /**
   * Cleans a directory by removing it and its contents
   * @param dirPath The directory path to clean
   */
  public cleanDirectory(dirPath: string): void {
    const fullPath = this.resolvePath(dirPath);

    tryCatchWithBuildError(
      () => {
        if (existsSync(fullPath)) {
          logWithStyle(`Cleaning directory: ${fullPath}`, ConsoleStyles.INFO);
          rmSync(fullPath, { recursive: true });
        }
      },
      `Failed to clean directory: ${fullPath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Creates a directory if it doesn't exist
   * @param dirPath The directory path to create
   */
  public createDirectory(dirPath: string): void {
    const fullPath = this.resolvePath(dirPath);

    tryCatchWithBuildError(
      () => {
        if (!existsSync(fullPath)) {
          logWithStyle(`Creating directory: ${fullPath}`, ConsoleStyles.INFO);
          mkdirSync(fullPath, { recursive: true });
        }
      },
      `Failed to create directory: ${fullPath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Copies a file from source to destination
   * @param sourcePath The source file path
   * @param destPath The destination file path
   * @param options Copy options
   */
  public copyFile(sourcePath: string, destPath: string, options: { force?: boolean } = {}): void {
    const fullSourcePath = this.resolvePath(sourcePath);
    const fullDestPath = this.resolvePath(destPath);

    // Ensure the destination directory exists
    const destDir = dirname(fullDestPath);

    this.createDirectory(destDir);

    tryCatchWithBuildError(
      () => {
        logWithStyle(`Copying: ${fullSourcePath} -> ${fullDestPath}`, ConsoleStyles.DEBUG);
        cpSync(fullSourcePath, fullDestPath, { force: options.force });
      },
      `Failed to copy file: ${sourcePath} -> ${destPath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Copies a directory recursively
   * @param sourcePath The source directory path
   * @param destPath The destination directory path
   * @param options Copy options
   */
  public copyDirectory(sourcePath: string, destPath: string, options: { isOptional?: boolean, recursive?: boolean, preserveTimestamps?: boolean } = {}): void {
    const fullSourcePath = this.resolvePath(sourcePath);
    const fullDestPath = this.resolvePath(destPath);

    if (!existsSync(fullSourcePath)) {
      if (options.isOptional) {
        logWithStyle(`Source directory does not exist (optional): ${sourcePath}`, ConsoleStyles.WARNING);

        return;
      }
      throw new BuildError(`Source directory does not exist: ${sourcePath}`, ErrorCodes.FILE_OPERATION);
    }

    tryCatchWithBuildError(
      () => {
        logWithStyle(`Copying directory: ${fullSourcePath} -> ${fullDestPath}`, ConsoleStyles.INFO);
        cpSync(fullSourcePath, fullDestPath, {
          recursive: options.recursive ?? true,
          preserveTimestamps: options.preserveTimestamps ?? true,
        });
      },
      `Failed to copy directory: ${sourcePath} -> ${destPath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Checks whether a file exists at the specified path.
   *
   * @param filePath - The relative or absolute path to the file to check.
   * @returns `true` if the file exists at the resolved path, otherwise `false`.
   */
  fileExists(filePath: string): boolean {
    const fullPath = this.resolvePath(filePath);


    return existsSync(fullPath);
  }

  /**
   * Copies all non-directory files from a directory to another
   * @param sourcePath The source directory path
   * @param destPath The destination directory path
   */
  public copyTopLevelFiles(sourcePath: string, destPath: string): void {
    const fullSourcePath = this.resolvePath(sourcePath);
    const fullDestPath = this.resolvePath(destPath);

    tryCatchWithBuildError(
      () => {
        const files = readdirSync(fullSourcePath, { withFileTypes: true });

        files.forEach((file) => {
          if (!file.isDirectory()) {
            const src = join(fullSourcePath, file.name);
            const dest = join(fullDestPath, file.name);

            logWithStyle(`Copying file: ${src} -> ${dest}`, ConsoleStyles.DEBUG);
            cpSync(src, dest);
          }
        });
      },
      `Failed to copy top-level files from: ${sourcePath} to: ${destPath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Reads a file as text
   * @param filePath The file path to read
   * @returns The file contents as string
   */
  public readFile(filePath: string): string {
    const fullPath = this.resolvePath(filePath);

    return tryCatchWithBuildError(
      () => readFileSync(fullPath, 'utf-8'),
      `Failed to read file: ${filePath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Writes text to a file
   * @param filePath The file path to write to
   * @param content The content to write
   */
  public writeFile(filePath: string, content: string): void {
    const fullPath = this.resolvePath(filePath);

    // Ensure the directory exists
    const dir = dirname(fullPath);

    this.createDirectory(dir);

    tryCatchWithBuildError(
      () => writeFileSync(fullPath, content, 'utf-8'),
      `Failed to write file: ${filePath}`,
      ErrorCodes.FILE_OPERATION,
    );
  }

  /**
   * Resolves a path relative to the root directory
   * @param path The path to resolve
   * @returns The absolute path
   */
  public resolvePath(path: string): string {
    if (path.startsWith('/') || (/^[A-Z]:/iu).test(path)) {
      return path; // Already an absolute path
    }

    return resolve(this.rootDir, path);
  }

  /**
   * Copies all locale files ending with `.src.json` from the specified source directory,
   * renaming them to `.json` and saving them in the same directory.
   *
   * @param srcDir - The source directory containing `.src.json` locale files.
   */
  compileLocales(srcDir: string) {
    const fullSrcDir = this.resolvePath(srcDir);
    const files = readdirSync(fullSrcDir, { withFileTypes: true });

    files.forEach((file) => {
      if (file.isFile() && file.name.endsWith('.src.json')) {
        const srcFilePath = join(fullSrcDir, file.name);
        const destFileName = file.name.replace(/\.src\.json$/u, '.json');
        const destFilePath = join(fullSrcDir, destFileName);

        const content = this.readFile(srcFilePath);

        this.writeFile(destFilePath, content);

        logWithStyle(`Copied locale: ${srcFilePath} -> ${destFilePath}`, ConsoleStyles.DEBUG);
      }
    });
  }


  /**
   * Merges locale files from the source and plugin directories into the destination directory.
   * @param srcDir The source directory containing locale files.
   * @param pluginDir The plugin directory containing additional locale files.
   */
  /**
   * Recursively finds all .json files inside any 'locales' folder under the given directory.
   * @param dir The directory to search.
   * @returns Array of absolute paths to .json files in 'locales' folders.
   */
  private findLocalesJsonFiles(dir: string, found: string[] = []): string[] {
    const fullDir = this.resolvePath(dir);

    logWithStyle(`Searching for locale files in: ${fullDir}`, ConsoleStyles.DEBUG);
    const entries = readdirSync(fullDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(fullDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'locales') {
          logWithStyle(`Found 'locales' directory: ${entryPath}`, ConsoleStyles.DEBUG);
          const localeFiles = readdirSync(entryPath, { withFileTypes: true })
            .filter((f) => f.isFile() && f.name.endsWith('.src.json'))
            .map((f) => join(entryPath, f.name));

          localeFiles.forEach((file) => logWithStyle(`Found locale file: ${file}`, ConsoleStyles.DEBUG));
          found.push(...localeFiles);
        } else {
          this.findLocalesJsonFiles(entryPath, found);
        }
      }
    }

    return found;
  }

  /**
   * Merges all .json locale files found in 'locales' folders under srcDir and pluginDir.
   * Files from pluginDir overwrite those from srcDir if conflicts exist.
   * @param srcDir The public directory to search for locales.
   * @param proDir The pro directory to search for locales.
   */
  mergeLocales(srcDir: string, proDir?: string) {
    let srcJsonFiles: string[] = [];

    if (!proDir) {
      logWithStyle('No proDir specified, compiling locales only from srcDir', ConsoleStyles.INFO);

      srcJsonFiles = this.findLocalesJsonFiles(srcDir);
    } else {
      logWithStyle(`ProDir specified: ${proDir}`, ConsoleStyles.INFO);

      logWithStyle(`Merging locales from: ${srcDir} and ${proDir}`, ConsoleStyles.INFO);
      // Find all .json files in 'locales' folders under srcDir (excluding pluginDir)
      srcJsonFiles = this.findLocalesJsonFiles(srcDir)
        .filter((p) => !p.startsWith(this.resolvePath(proDir)));

      logWithStyle(`Source locale files: ${JSON.stringify(srcJsonFiles, null, 2)}`, ConsoleStyles.SUCCESS);

      // Find all .json files in 'locales' folders under pluginDir
      const pluginJsonFiles = this.findLocalesJsonFiles(proDir);

      // Append plugin files to src files, plugin files take precedence
      srcJsonFiles.push(...pluginJsonFiles);

      logWithStyle(`Plugin locale files: ${JSON.stringify(pluginJsonFiles, null, 2)}`, ConsoleStyles.SUCCESS);
    }


    // Helper to get relative path from rootDir for matching
    const getRel = (absPath: string) => absPath.replace(this.rootDir, '');

    // Merge src locale files first
    const mergedLocales: Record<string, any> = {};

    // Group source locale files by file name
    const srcFilesByName: Record<string, string[]> = {};

    for (const srcPath of srcJsonFiles) {
      const fileName = srcPath.split(/[\\/]/u).pop()!;

      if (!srcFilesByName[fileName]) {
        srcFilesByName[fileName] = [];
      }
      srcFilesByName[fileName].push(srcPath);
    }

    // Merge all source locale files with matching names
    // eslint-disable-next-line guard-for-in
    for (const fileName in srcFilesByName) {
      const paths = srcFilesByName[fileName];
      let mergedContent: any = {};

      for (const srcPath of paths) {
        logWithStyle(`Reading source locale file: ${srcPath}`, ConsoleStyles.DEBUG);
        const srcContent = JSON.parse(this.readFile(srcPath));

        mergedContent = { ...mergedContent, ...srcContent, ...{ plugins: { ...mergedContent.plugins, ...srcContent.plugins } } };
      }

      // Use the relative path of the first file for output
      const rel = getRel(paths[0]);

      mergedLocales[rel] = mergedContent;
    }

    // Write merged locales to /src/locales/, removing the .src from *.src.json
    const targetDir = this.resolvePath(`${srcDir}/locales`);

    this.createDirectory(targetDir);

    for (const rel in mergedLocales) {
      // Get the file name and remove .src from *.src.json
      let fileName = rel.split(/[\\/]/u).pop()!;

      fileName = fileName.replace(/\.src\.json$/u, '.json');

      const absPath = join(targetDir, fileName);

      logWithStyle(`Writing merged locale file: ${absPath}`, ConsoleStyles.INFO);
      this.writeFile(absPath, JSON.stringify(mergedLocales[rel], null, 2));
    }
  }

  /**
   * Merges two locale files into one.
   * @param srcPath The path to the source locale file.
   * @param pluginPath The path to the plugin locale file.
   * @returns The merged content as a string.
   */
  mergeLocaleFiles(srcPath: string, pluginPath: string): string {
    // Read the source file as .src.json even if srcPath is .json
    const srcPathSrcJson = srcPath.endsWith('.src.json') ? srcPath : srcPath.replace(/\.json$/u, '.src.json');
    const srcContent = this.readFile(srcPathSrcJson);
    const pluginContent = this.readFile(pluginPath);

    const srcJson = JSON.parse(srcContent);
    const pluginJson = JSON.parse(pluginContent);

    const mergedJson = { ...srcJson, ...pluginJson, ...{ plugins: { ...srcJson.plugins, ...pluginJson.plugins } } };

    logWithStyle(`Merged locale files: ${srcPath} + ${pluginPath}`, ConsoleStyles.DEBUG);

    return JSON.stringify(mergedJson, null, 2);
  }
}
