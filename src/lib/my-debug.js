var path = require('path');
var debug = require('debug');

module.exports = function(mod) {
    var libName = path.relative(path.dirname(module.filename), mod.filename);
    return debug('strider-docker-runner:' + libName);
};
