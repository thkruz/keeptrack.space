import { copyFileSync, mkdir, writeFileSync } from 'fs';
import { BuildConfig } from './config-manager';

export class SupaBaseManager {
  compileEnvVariables(config: BuildConfig) {
    mkdir('./dist/auth', { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
      }
    });

    try {
      copyFileSync(
        './src/plugins-pro/user-account/callback.html',
        './dist/auth/callback.html',
      );
      copyFileSync(
        './src/plugins-pro/user-account/popup-callback.js',
        './dist/auth/popup-callback.js',
      );
      // Write html to src/plugins-pro/user-account/auth-config.js
      writeFileSync(
        './dist/auth/auth-config.js',
        `export const supabaseUrl = '${config.PUBLIC_SUPABASE_URL}';\n` +
        `export const supabaseKey = '${config.PUBLIC_SUPABASE_ANON_KEY}';\n`,
      );
    } catch (error) {
      console.warn('Error copying files:', error);
    }
  }
}
