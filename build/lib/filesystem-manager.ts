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
  mergeLocales(srcDir: string, pluginDir: string) {
    // Read locale files from the source directory
    const srcLocales = readdirSync(this.resolvePath(srcDir), { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.src.json'))
      .map((file) => file.name.replace(/\.src\.json$/u, '.json'));

    // Read locale files from the plugin directory
    let pluginLocales: string[] = [];

    try {
      pluginLocales = readdirSync(this.resolvePath(pluginDir), { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith('.json'))
        .map((file) => file.name);
    } catch {
      pluginLocales = [];
    }

    // If a srcLocale file and pluginLocale file have the same name, merge them
    srcLocales.forEach((locale) => {
      if (pluginLocales.includes(locale)) {
        const srcPath = this.resolvePath(`${srcDir}/${locale}`);
        const pluginPath = this.resolvePath(`${pluginDir}/${locale}`);

        // Merge the locale files
        const mergedContent = this.mergeLocaleFiles(srcPath, pluginPath);

        this.writeFile(srcPath, mergedContent);

        console.log(`Merged and wrote locale file: ${locale} to ${srcPath}`);
      } else {
        console.log(`No matching plugin locale file for: ${locale}`);
        // Just write the source locale file to the destination
        const srcPath = this.resolvePath(`${srcDir}/${locale}`);
        // Read the source file as .src.json even if srcPath is .json
        const srcPathSrcJson = srcPath.replace(/\.json$/u, '.src.json');
        const content = this.readFile(srcPathSrcJson);

        this.writeFile(srcPath, content);
        console.log(`Wrote source locale file: ${locale} to ${srcPath}`);
      }
    });
  }

  /**
   * Merges two locale files into one.
   * @param srcPath The path to the source locale file.
   * @param pluginPath The path to the plugin locale file.
   * @returns The merged content as a string.
   */
  mergeLocaleFiles(srcPath: string, pluginPath: string): string {
    // Read the source file as .src.json even if srcPath is .json
    const srcPathSrcJson = srcPath.replace(/\.json$/u, '.src.json');
    const srcContent = this.readFile(srcPathSrcJson);
    const pluginContent = this.readFile(pluginPath);

    const srcJson = JSON.parse(srcContent);
    const pluginJson = JSON.parse(pluginContent);

    const mergedJson = { ...srcJson, ...pluginJson };

    console.log(`Merged locale files: ${srcPath} + ${pluginPath}`);

    return JSON.stringify(mergedJson, null, 2);
  }
}
