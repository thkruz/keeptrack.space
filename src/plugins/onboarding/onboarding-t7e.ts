import { type TranslationKey, t7e } from '@app/locales/keys';

/**
 * Shorthand for this plugin's locale keys. All onboarding strings live under
 * `plugins.OnboardingPlugin.*` in the plugin's locales folder.
 */
export const l = (key: string): string => t7e(`plugins.OnboardingPlugin.${key}` as TranslationKey);
