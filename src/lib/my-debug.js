var path = require('path');
var debug = require('debug');

module.exports = function(mod) {
  const libName = path.relative(path.dirname(module.filename), mod.filename);
  const dbg = debug(`strider-docker-runner:${libName}:DEBUG`);
  const err = debug(`strider-docker-runner:${libName}:ERROR`);
  err.log = console.error.bind(console);
  dbg.error = err;
  return dbg;
};
