var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var es = require('event-stream');
var debug = require('./my-debug')(module);
var async = require('async');
var demuxer = require('./demuxer');
var inspect = require('util').inspect;
const dockerUtil = require('./docker-util');

function findLocalImage(docker, image, done) {
  var withoutTag = image.split(':')[0];
  var fullname = image === withoutTag ?
                  image + ':latest' :
                  image;

  docker.listImages({ filter: withoutTag }, function(err, images) {
    if (err) {
      return done(err);
    }

    const found = images.find(function(img) {
      return ~img.RepoTags.indexOf(fullname);
    });

    done(null, found);
  });
}

function pull(docker, image, done) {
  docker.pull(image, function(err, streamc) {
    if (err) {
      debug('Error while pulling docker image', image);
      return done(err);
    }

    streamc
      .pipe(es.map(function(data, cb) {
        cb(null, JSON.parse(data));
      }))
      .on('data', function(event) {
        debug('pull event: ' + inspect(event));
      })
      .on('end', function() {
        done();
      });
  });
}

function create(createOptions, docker, config, done) {
  docker.createContainer(createOptions, function(err, container) {
    if (err) {
      return done(new Error(err));
    }
    const shortId = dockerUtil.shortenId(container.id);
    debug('Creaated a container', shortId);

    container.attach({
      stream: true, stdin: true,
      stdout: true, stderr: true
    }, attached);

    function attached(err, streamc) {
      if (err) {
        return done(err);
      }
      if (!streamc) {
        return done(new Error('Failed to attach container stream'));
      }

      var volumes = {};
      if (config.volumes) {
        config.volumes.forEach(function(v) {
          volumes[v] = {};
        });
      }

      const startOptions = {
        Privileged: !!config.privileged,
        PublishAllPorts: !!config.publishAllPorts,
        Dns: config.dns,
        Binds: config.binds,
        Volumes: volumes,
        VolumesFrom: config.volumesFrom
      };

      // start, and wait for it to be done
      container.start(startOptions, function(err, data) {
        if(err) {
          debug('Error while starting container', shortId);
          kill(function(err) {
            if (err) {
              debug('Error while killing the container, which failed to start', err);
            } else {
              debug('Killed the container, which had failed to start', shortId);
            }
          });
          return done(new Error(err));
        }
        debug('Started the container', shortId, data);

        container.wait(function(err, data) {
          debug('Done with the container', shortId, err, data);
          container.stop(function(err, _) {
            debug('Stopped the container', shortId);
          });
        });
        done(err, spawn.bind(null, streamc), kill);
      });
    }

    function kill(done) {
      container.remove({
        force: true, // Stop container and remove
        v: true // Remove any attached volumes
      }, done);
    }

    function spawn(streamc, command, args, options, done) {
      var proc = new EventEmitter();
      proc.kill = function() {
        streamc.write(JSON.stringify({type: 'kill'}) + '\n');
      };
      proc.stdout = new stream.PassThrough();
      proc.stderr = new stream.PassThrough();
      proc.stdin = streamc;
      var stdout = new stream.PassThrough();
      var stderr = new stream.PassThrough();

      done(null, proc);

      var demux = demuxer(streamc, stdout, stderr);

      stdout
        .pipe(es.split())
        .pipe(es.parse())
        .pipe(es.mapSync(function(data) {
          debug('got an event', data);
          if (data.event === 'stdout') {
            proc.stdout.write(data.data);
          }
          if (data.event === 'stderr') {
            proc.stderr.write(data.data);
          }
          if (data.event === 'exit') {
            proc.emit('exit', data.code);
            streamc.removeListener('readable', demux);
            stdout.unpipe();
          }
        }));

      debug('Running command', shortId, command, args);

      streamc.write(JSON.stringify({command: command, args: args, type: 'start'}) + '\n');
    }
  });
}

module.exports = function(createOptions, docker, config, done) {
  async.waterfall([
    function(callback) {
      findLocalImage(docker, createOptions.Image, callback);
    }, function(localImage, callback) {
      if (localImage) {
        debug('Container image is already locally', dockerUtil.shortenId(localImage.Id));
        return callback();
      }
      debug('Unable to find image "%s" locally', createOptions.Image);
      pull(docker, createOptions.Image, callback);
    }, function() {
      create(createOptions, docker, config, done);
    }
  ]);
};
