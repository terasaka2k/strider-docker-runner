var Runner = require('strider-simple-runner').Runner
  , runDocker = require('./run');

var create = function(emitter, config, context, done){
  config = config || {};
  Object.assign(config, {
    processJob: runDocker
  });

  var runner = new Runner(emitter, config);
  runner.id = 'docker';
  runner.loadExtensions(context.extensionPaths, function(err) {
    done(err, runner);
  });
};

module.exports = {
  create: create,
  config: {
    namePrefix: String,
    host: String,
    port: Number,
    socketPath: String,
    dns: [String],
    dockerHost: String,
    binds: [String],
    volumes: [String],
    volumesFrom: [String]
  }
};