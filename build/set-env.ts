import { copyFileSync, existsSync } from 'fs';
import { ConsoleStyles, logWithStyle } from './lib/build-error';

// read the 1st argument from the command line
const env = process.argv[2] ?? 'app';

// check if there is a .env file for the environment
const envFilePath = `.env.${env}`;

logWithStyle(`Setting environment to: ${env}`, ConsoleStyles.INFO);

if (existsSync(envFilePath)) {
  // overwrite the .env file with the contents of the specified environment file
  copyFileSync(envFilePath, '.env');
  logWithStyle(`Environment file ${envFilePath} copied to .env successfully`, ConsoleStyles.SUCCESS);
} else {
  // if the file does not exist, throw an error
  throw new Error(`Environment file ${envFilePath} does not exist.`);
}
