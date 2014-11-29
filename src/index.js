/* eslint-env node */

require('6to5/polyfill');
require('6to5/runtime');

try {
  require('./_development');
} catch (err) {}

module.exports = require('./lib');
