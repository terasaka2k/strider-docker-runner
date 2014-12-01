const
  Runner = require('strider-simple-runner').Runner,
  routes = require('./routes'),
  runDocker = require('./run'),
  namespace = require('strider-extension-loader/lib/namespace'),
  debug = require('./my-debug')(module);


const create = function(emitter, config, context, done){
  routeAPI('docker', context);
  const { models: { Job } } = context;

  config = config || {};
  Object.assign(config, { processJob: runDocker });

  emitter.on('plugin.docker.container.started', (...args) => recordJobContainer(Job, ...args));

  const runner = new Runner(emitter, config);
  runner.id = 'docker';
  runner.loadExtensions(context.extensionPaths, function(err) {
    done(err, runner);
  });
};

module.exports = {
  create: create,
  // FIXME: Should be appConfig instead of config?
  config: {
    dockerHost: String,
    namePrefix: String,
    container: {
      host: String,
      port: Number,
      dns: [String],
      binds: [String],
      volumes: [String],
      volumesFrom: [String]
    }
  },
  routes
};


function recordJobContainer(Job, containerId, job) {
  Job.findByIdAndUpdate(job._id, { $set: { 'runner.data.containerId': containerId } }, (err) => {
    if (err) {
      debug.error('Error while updating job=%s to have its containerId=%s.', job._id, containerId, err);
    }
  });
}


function routeAPI(id, context) {
  const mid = context.middleware;
  const app = namespace(context.app, '/:org/:repo/api/' + id, mid.project, runnerConfig);
  module.exports.routes(app, context);
}

function runnerConfig(req, res, next) {
  const { project, query } = req;
  const branch = project.branch(query.branch);

  // See lib/middleware.js of strider
  if (!branch) {
    return res.send(404, 'Specified branch not found for the project');
  }
  if (branch.mirror_master) {
    return res.send(400, 'Branch not individually configurable');
  }

  const { runner } = branch;

  if (runner.id !== 'docker') {
    return res.send(400, `Runner for branch=${branch.name} is not 'docker', but '${branch.runner.id}'.`);
  }

  req.runnerConfig = function (config, callback) {
    if (arguments.length === 0) {
      return runner.config;
    }

    runner.config = config;
    branch.markModified('runner.config');

    project.save(function(err) {
      if (err) {
        return callback(err);
      }
      callback(err, config);
    });
  };

  return next();
}
