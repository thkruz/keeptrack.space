/* globals
  __dirname
  require
*/

const fs = require('fs');
const { join } = require('path');

// Get the package obejct and change the name
const pkg = require('../package.json');
pkg.name = '@thkruz/keeptrack.space';

// Update package.json with the udpated name
// eslint-disable-next-line no-sync
fs.writeFileSync(join(__dirname, '../package.json'), JSON.stringify(pkg));
