import { copyFileSync, existsSync } from 'node:fs';

// read the 1st argument from the command line
const env = process.argv[2] ?? 'app';

// Validate the environment name before building a file path with it. Restricting
// to a simple token (no slashes, dots, or "..") prevents a faulty/hostile CLI
// argument from escaping the project directory via the constructed `.env.<env>` path.
if (!(/^[a-zA-Z0-9_-]+$/u).test(env)) {
  throw new Error(`Invalid environment name "${env}". Use letters, digits, '-' or '_' only.`);
}

// check if there is a .env file for the environment
const envFilePath = `.env.${env}`;

if (existsSync(envFilePath)) {
  // overwrite the .env file with the contents of the specified environment file
  copyFileSync(envFilePath, '.env');
  console.log(`Environment file ${envFilePath} copied to .env successfully.`);
} else {
  // if the file does not exist, throw an error
  throw new Error(`Environment file ${envFilePath} does not exist.`);
}
