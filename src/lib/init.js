var Docker = require('dockerode')
  , dockerUtil = require('./docker-util');

module.exports = function(runnerConfig, done) {
  const dockerConfig = {
    docker_host: runnerConfig.dockerHost
  };

  const options = dockerUtil.normalizeOptions(dockerConfig, process.env);

  const docker = new Docker(options);

  // Test connection
  docker.listContainers(function(err) {
    if (err) {
      err.connectOptions = options;
    }
    done(err, docker);
  });
};
