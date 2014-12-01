const
  debug = require('./my-debug')(module),
  assert = require('power-assert'),
  R = require('ramda'),
  moment = require('moment'),
  Async = require('async'),
  initDocker = require('./init'),
  { DEFAULT_NAME_PREFIX, DEFAULT_MAX_INMATURE_JOB_DURATION } = require('./defaults');

module.exports = function routes(app, context) {
  const { models: { Job } } = context;

  // TODO: May be better to move this route to globalRoute, but where does appPanel exist?
  app.get('containers', (req, res) => {
    const runnerConfig = req.runnerConfig() || {};
    const projectName = req.project.name;
    const branch = req.query.branch;

    const namePrefix = '/' + (runnerConfig.namePrefix || DEFAULT_NAME_PREFIX).replace(/^\//, ''); // Normalize name

    assert(projectName);
    assert(branch);
    const isThisBranchJob = (job) => job.project == projectName && job.ref.branch === branch;

    Async.parallel([
        (done) => getRunningContainers(runnerConfig, done),
        (done) => getRunningJobs(Job, 'docker', done)
      ],
      (err, results) => {
        if (err) {
          const errMsg = 'Error while collecting running jobs and their containers';
          debug.error(errMsg, err);
          return res.send(500, { msg: errMsg, err });
        }

        const [ runningContainers, runningJobs ] = results;
        const branchJobs = runningJobs.filter(isThisBranchJob);

        const zombieContainers = collectZombieContainers(namePrefix, runningContainers, runningJobs);
        const jobContainers = collectJobContainers(runningContainers, branchJobs);
        res.send({
          jobContainers,
          zombieContainers
        });
      }
    );
  })
};

function collectZombieContainers(namePrefix, runningContainers, runningJobs) {
  const startsWithNamePrefix = (name) => name.startsWith(namePrefix);
  const jobContainerIds = runningJobs.map(R.path('runner.data.containerId'));

  const isUnknown = (c) => !jobContainerIds.includes(c.Id);
  const hasNamePrefix = (c) => c.Names.some(startsWithNamePrefix);

  const isZombie = R.allPredicates([isUnknown, hasNamePrefix]);
  return runningContainers.filter(isZombie);
}

function collectJobContainers(containers, jobs) {
  const jobContainerIds = jobs.map((job) => {
    const containerId = R.path('runner.data.containerId', job);

    if (!containerId) {
      debug.error('Job=%s doesn\'t have runner.data.containerId property', job._id);
      return null;
    }
    return containerId;
  });

  const isJobContainer = (container) => jobContainerIds.includes(container.Id);
  return containers.filter(isJobContainer);
}

function getRunningContainers(config, done) {
  initDocker(config, (err, docker) => {
    if (err) {
      return done(err);
    }
    docker.listContainers(done);
  });
}

function getRunningJobs(Job, runnerId, done) {
  const acceptableImmatureJobThresh = moment().subtract(DEFAULT_MAX_INMATURE_JOB_DURATION);
  Job.find({
    created: { $lt: acceptableImmatureJobThresh.toDate() },
    'runner.id': runnerId,
    finished: { $exists: false }
  }, done);
}
