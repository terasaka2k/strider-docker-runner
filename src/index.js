/* eslint-env node */

require('source-map-support').install();

require('6to5/runtime');
require('./lib/es7polyfill');

const assert = require('power-assert');

assert(Symbol.iterator, 'Ensure ECMAScript 6 Polyfill');
assert([1, 2, 3].includes(1), 'Ensure ECMAScript 7 Polyfill');

try {
  require('./lib/_development');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

module.exports = require('./lib');
