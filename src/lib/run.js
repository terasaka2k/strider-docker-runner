var createSlave = require('./slave');
var processJob = require('strider-runner-core').process;
var _ = require('lodash');
var initDocker = require('./init');
const dockerUtil = require('./docker-util');
var debug = require('./my-debug')(module);


const DEFAULT_IMAGE = 'strider/strider-docker-slave';
const DEFAULT_NAME_PREFIX = 'strider-job-';


module.exports = function(job, provider, plugins, config, next) {
  const { branchConfig: { runner: { config: runnerConfig } } } = config;

  initDocker(runnerConfig, function(err, docker) {
    let alreadyCancelled = false;

    if (err) {
      return next(new Error('Cannot connect to Docker with options ' + JSON.stringify(err.connectOptions)));
    }

    const slaveName = createContainerName(job, runnerConfig.namePrefix);
    const slaveConfig = createSlaveConfig(plugins, runnerConfig.container);

    config.io.emit('job.status.command.comment', job._id, {
      comment: `Creating docker container with name=${slaveName} from image=${dockerUtil.shortenId(slaveConfig.image)}`,
      plugin: 'docker',
      time: new Date()
    });

    config.io.on('job.cancel', () => alreadyCancelled = true);

    createSlave(docker, slaveName, slaveConfig, function(err, spawn, kill) {
      const shortJobId = job._id.toString().substr(0, 8);

      if (err) {
        return next(err);
      }
      debug('Container=%s is ready for job=%s', dockerUtil.shortenId(kill.id), shortJobId);

      if (alreadyCancelled) {
        debug('Killing the container of already cancelled job=%s', shortJobId);
        killContainer(job._id);
        return next();
      }

      config.io.on('job.cancel', killContainer);

      Object.assign(config, { spawn });

      processJob(job, provider, plugins, config, function(err, ...args) {
        if (err) {
          debug('Error while processing job=%s %o', job._id, job);
        }
        killContainer(job._id);
        next.call(this, err, ...args);
      });

      function killContainer(jobId) {
        if (jobId.toString() !== job._id.toString()) {
          return;
        }

        kill((err) => {
          if (err) {
            debug('Error while the container for job=%s being killed', shortJobId);
          } else {
            debug('The container for job=%s was killed', shortJobId);
          }
        });
      }
    });
  });
};


function createContainerName(job, namePrefix=DEFAULT_NAME_PREFIX) {
  var shortJobId = job._id.toString().substr(0, 8);
  return namePrefix + shortJobId;
}


function createSlaveConfig(plugins, containerConfig) {
  const slaveConfig =  {
    image: DEFAULT_IMAGE
  };

  Object.assign(slaveConfig, containerConfig);

  slaveConfig.volumes = parseVolumes(slaveConfig.volumes);
  slaveConfig.env = collectEnvVars(plugins);

  return slaveConfig;
}

function collectEnvVars(plugins) {
  return plugins.reduce((vars, plugin) => {
    const env = plugin.env || {};
    const envVars = Object.keys(env).map((name) => `${name}=${env[name]}`);
    return vars.concat(envVars);
  }, []);
}

function parseVolumes(volumesConfig=[]) {
  const volumes = {};
  for (let v of volumesConfig) {
    volumes[v] = {};
  }
  return volumes;
}
