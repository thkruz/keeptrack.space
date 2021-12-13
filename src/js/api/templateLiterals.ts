// This is not a standard function. It is used in development for formatting template literals.
// example: keepTrackApi.html`<div>example text</div>`
export const html = (strings: TemplateStringsArray, ...placeholders: any[]) => {
  for (const placeholder of placeholders) {
    if (typeof placeholder !== 'string') {
      throw Error('Invalid input');
    }
  }
  return String.raw(strings, ...placeholders);
};
