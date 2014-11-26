var createContainer = require('./create-container');

const DEFAULT_NAME_PREFIX = 'strider-job-';

module.exports = createSlave;
createSlave.DEFAULT_NAME_PREFIX = DEFAULT_NAME_PREFIX;

function createSlave(docker, config, done) {
  const namePrefix = config.namePrefix || DEFAULT_NAME_PREFIX;
  const name = namePrefix + config.id.toString().substr(0, 8);

  const createOptions = {
    name: name,
    Image: config.image,
    Env: config.env,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: true,
    Tty: false
  };
  createContainer(createOptions, docker, config, done);
}
