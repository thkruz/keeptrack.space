import { errorManagerInstance } from '../errorManager';

/**
 * This is not a standard function. It is used in development for formatting template literals.
 * example: keepTrackApi.html\`\<div>example\</div>\`
 * TODO: This should be a static method
 */
export const html = (strings: TemplateStringsArray, ...placeholders: string[]) => {
  for (const placeholder of placeholders) {
    if (typeof placeholder !== 'string') {
      errorManagerInstance.error(new Error('Invalid input'), 'keepTrackApi.html');
    }
  }

  return String.raw(strings, ...placeholders);
};

/**
 * This is not a standard function. It is used in development for formatting template literals.
 * example: glsl\`uniform float example\`
 * TODO: This should be a static method
 */
export const glsl = (literals: TemplateStringsArray, ...placeholders): string => {
  let str = '';

  for (let i = 0; i < placeholders.length; i++) {
    str += literals[i];
    str += placeholders[i];
  }
  str += literals[literals.length - 1];

  return str;
};
