var createContainer = require('./create-container');

module.exports = createSlave;

function createSlave(docker, name, slaveConfig, done) {
  const createOptions = {
    name: name,
    Image: slaveConfig.image,
    Env: slaveConfig.env,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: true,
    Tty: false
  };
  createContainer(createOptions, docker, slaveConfig, done);
}
