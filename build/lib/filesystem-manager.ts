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
  public copyDirectory(sourcePath: string, destPath: string, options: { recursive?: boolean, preserveTimestamps?: boolean } = {}): void {
    const fullSourcePath = this.resolvePath(sourcePath);
    const fullDestPath = this.resolvePath(destPath);

    if (!existsSync(fullSourcePath)) {
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
}
