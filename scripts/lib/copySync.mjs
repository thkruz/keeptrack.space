/* eslint-disable no-sync */
import fs from 'fs';

export const copySync = (src, dest) => {
  const data = fs.readFileSync(src);
  fs.writeFileSync(dest, data);
};

export default copySync;
