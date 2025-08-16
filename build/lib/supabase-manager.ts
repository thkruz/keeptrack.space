import { copyFileSync, mkdir, writeFileSync } from 'fs';
import { BuildConfig } from './config-manager';

export class SupaBaseManager {
  compileEnvVariables(config: BuildConfig) {
    // Write html to src/plugins-pro/user-account/auth-config.js
    writeFileSync(
      './src/plugins-pro/user-account/auth-config.js',
      `export const supabaseUrl = '${config.PUBLIC_SUPABASE_URL}';\n` +
      `export const supabaseKey = '${config.PUBLIC_SUPABASE_ANON_KEY}';\n`,
    );

    mkdir('./dist/auth', { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
      }
    });

    copyFileSync(
      './src/plugins-pro/user-account/callback.html',
      './dist/auth/callback.html',
    );
    copyFileSync(
      './src/plugins-pro/user-account/popup-callback.js',
      './dist/auth/popup-callback.js',
    );
    copyFileSync(
      './src/plugins-pro/user-account/auth-config.js',
      './dist/auth/auth-config.js',
    );
  }
}
