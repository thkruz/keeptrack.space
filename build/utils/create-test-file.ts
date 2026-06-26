// eslint-disable-next-line @typescript-eslint/no-var-requires
import { writeFileSync } from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

// Verify current directory is scripts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname, '..', 'test');

/**
 * Resolve the destination test file and ensure it stays inside TEST_DIR. The
 * file name comes from a CLI argument / stdin, so a value containing `..` or an
 * absolute path could otherwise escape the project directory. Throws on escape.
 */
const safeTestPath = (name: string): string => {
  const baseResolved = resolve(TEST_DIR);
  const target = resolve(baseResolved, `${name}.test.ts`);

  if (!target.startsWith(baseResolved + sep)) {
    throw new Error(`Refusing to write test file outside ${baseResolved}: ${name}`);
  }

  return target;
};

// Get first argument from command line
const fileName = process.argv[2];


if (__dirname.split('\\').pop() !== 'scripts') {
  const red = '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${red}Please run this script using \`npm run createtest <filename>\`.${reset}`);
  // eslint-disable-next-line no-process-exit
  process.exit();
}

if (!fileName) {
  console.log('Enter file name: ');

  process.stdin.on('data', (input) => {
    const fileName: string = input.toString().trim();

    // Create an empty .test.ts file
    writeFileSync(safeTestPath(fileName), '');

    // Exit process
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  });
} else {

  // Create an empty .test.ts file
  writeFileSync(safeTestPath(fileName), '');
}
