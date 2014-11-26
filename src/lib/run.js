var createSlave = require('./slave');
var processJob = require('strider-runner-core').process;
var _ = require('lodash');
var initDocker = require('./init');
var debug = require('./my-debug')(module);


var DEFAULT_IMAGE = 'strider/strider-docker-slave';

module.exports = function(job, provider, plugins, config, next) {
  initDocker(config.branchConfig.runner.config, function(err, docker) {
    if (err) {
      return next(new Error('Cannot connect to Docker with options ' + JSON.stringify(err.connectOptions)));
    }

    var env = [];
    _.each(plugins, function(plugin) {
      if (plugin.env) {
        _.each(plugin.env, function(value, key) {
          env.push(key + '=' + value);
        });
      }
    });
    var slaveConfig = _.extend({
      id: job._id,
      dataDir: config.dataDir,
      image: config.image || DEFAULT_IMAGE,
      env: env
    }, config.branchConfig.runner.config);
    config.io.emit('job.status.command.comment', job._id, {
      comment: 'Creating docker container from ' + slaveConfig.image,
      plugin: 'docker',
      time: new Date()
    });
    createSlave(docker, slaveConfig, function(err, spawn, kill) {
      if (err) {
        return next(err);
      }
      config.spawn = spawn;
      processJob(job, provider, plugins, config, function(jobErr, ...args) {
        if (err) {
          debug('Error while processing job', job._id);
        }
        kill(function(killErr) {
          if (killErr) {
            debug('Failed to kill docker container!', killErr);
            console.error('Failed to kill docker container!', killErr);
          }
          if (jobErr || killErr) {
            next.call(this, new Error(jobErr || killErr), ...args);
          } else {
            next.call(this, void 0, ...args);
          }
        });
      });
    });
  });
};
