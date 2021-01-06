import download from 'download-file';

var url = 'https://www.keeptrack.space/TLE.json';

var options = {
  directory: './src/tle/',
  filename: 'TLE.json',
};

download(url, options, function (err) {
  if (err) {
    console.error(err);
    return;
  }
  console.log('TLE.json updated from KeepTrack.space');
});

url = 'https://www.keeptrack.space/offline/tle.js';

options = {
  directory: './src/offline/',
  filename: 'tle.js',
};

download(url, options, function (err) {
  if (err) {
    console.error(err);
    return;
  }
  console.log('tle.js updated from KeepTrack.space');
});
