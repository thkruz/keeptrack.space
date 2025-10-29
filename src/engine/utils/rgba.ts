
type rgbaType = [string | number, string | number, string | number, string | number];

/**
 * Converts a hexadecimal color code to an RGBA color code.
 * @param hex - The hexadecimal color code to convert.
 * @returns An array of RGBA values.
 * @throws An error if the input is not a valid hexadecimal color code.
 */
export const hex2rgba = (hex: string): rgbaType => {
  if (!(/^#(?:[A-Fa-f0-9]{3,6})$/u).test(hex)) {
    throw new Error('Invalid hex input');
  }
  let c: string[] | string = hex.substring(1).split('');

  if (c.length !== 3 && c.length !== 6) {
    throw new Error('Invalid hex input');
  }
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const parsedC = parseInt(c.join(''), 16);
  const r = ((parsedC >> 16) & 255) / 255;
  const g = ((parsedC >> 8) & 255) / 255;
  const b = (parsedC & 255) / 255;


  return [r, g, b, 1];
};

/**
 * Parses a string representation of an RGBA color code and returns an array of RGBA values.
 * @param str - The string representation of an RGBA color code to parse.
 * @returns An array of RGBA values.
 * @throws An error if the input is not a valid RGBA color code.
 */
export const parseRgba = (str: string): [number, number, number, number] => {
  const matches = str.match(/-?[\d.]+/gu);

  if (!matches || matches.length < 4) {
    throw new Error('Invalid rgba input');
  }
  let [r, g, b, a]: rgbaType = matches as rgbaType;

  r = parseFloat(<string>r) / 255;
  g = parseFloat(<string>g) / 255;
  b = parseFloat(<string>b) / 255;
  a = parseFloat(<string>a);
  if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1 || a < 0 || a > 1 || isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    throw new Error('Invalid rgba input');
  }

  return [r, g, b, a];
};
