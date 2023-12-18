import { readFileSync, writeFileSync } from 'fs';

const writeFile = (dest, data) => {
  try {
    writeFileSync(dest, data, { flag: 'wx' }, (err) => {
      if (err) {
        console.log('file ' + dest + ' already exists, testing next');
      } else {
        // console.log("Succesfully written " + dest);
      }
    });
  } catch {
    // console.log("Error writing " + dest);
  }
};
