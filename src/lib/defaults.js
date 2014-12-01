const moment = require('moment');

const DEFAULT_IMAGE = 'strider/strider-docker-slave';
const DEFAULT_NAME_PREFIX = 'strider-job-';
const DEFAULT_MAX_INMATURE_JOB_DURATION = moment.duration(1, 'second');

module.exports = {
  DEFAULT_IMAGE,
  DEFAULT_NAME_PREFIX,
  DEFAULT_MAX_INMATURE_JOB_DURATION
};
