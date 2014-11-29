const
  Runner = require('strider-simple-runner').Runner,
  initDocker = require('./init'),
  runDocker = require('./run'),
  namespace = require('strider-extension-loader/lib/namespace'),
  debug = require('./my-debug')(module);

const { DEFAULT_NAME_PREFIX } = require('./defaults');

const create = function(emitter, config, context, done){
  routes('docker', context);

  config = config || {};
  Object.assign(config, { processJob: runDocker });

  const runner = new Runner(emitter, config);
  runner.id = 'docker';
  runner.loadExtensions(context.extensionPaths, function(err) {
    done(err, runner);
  });
};

module.exports = {
  create: create,
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
  routes(app, context) {
    app.get('containers', (req, res, next) => {
      const config = req.runnerConfig() || {};
      const prefix = '/' + (config.namePrefix || DEFAULT_NAME_PREFIX).replace(/^\//, '');

      initDocker(config, (err, docker) => {
        if (err) {
          debug(err);
          return res.send(500, err);
        }
        docker.listContainers((err, containers) => {
          if (err) {
            debug(err);
            return res.send(500, err);
          }

          res.send(containers.filter(prefixFilter));
        });
      });

      function prefixFilter(container) {
        return container.Names.some((n) => n.startsWith(prefix));
      }
    });
  }
};

function routes(id, context) {
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
