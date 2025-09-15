
export const rgbCss = (values: [number, number, number, number]): string => {
  const val1 = Math.round(values[0] * 255);
  const val2 = Math.round(values[1] * 255);
  const val3 = Math.round(values[2] * 255);
  const val4 = values[3];


  return `rgba(${val1}, ${val2}, ${val3}, ${val4})`;
};
