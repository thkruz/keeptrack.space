/* eslint-disable */
/**
 * @todo Convert gpr.js to import format
 * @body Remove require statements and turn eslint on
 */

const fs = require('fs');
const { join } = require('path');

// Get the package obejct and change the name
const pkg = require('../package.json');
pkg.name = '@thkruz/keeptrack.space';

// Update package.json with the udpated name
fs.writeFileSync(join(__dirname, '../package.json'), JSON.stringify(pkg));
