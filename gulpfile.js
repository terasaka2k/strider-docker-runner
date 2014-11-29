/* eslint-env node */
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const to6 = require('gulp-6to5');
const filter = require('gulp-filter');
const cached = require('gulp-cached');
const filelog = require('gulp-filelog');
const wrapper = require('gulp-wrapper');

const files = [
  'config/**/*',
  'static/**/*',
  'lib/**/*',
  'index.js'
];
const rmFiles = files.concat([
  'config', 'static', 'lib'
]);

gulp.task('build', ['compile/src', 'download/es7polyfill']);

gulp.task('compile/src', function() {
  const jsFilter = filter('**/*.js');

  if (~this.seq.indexOf('watch')) {
    files.push('**/_*.js');
  }

  return gulp.src(files.map(function(s) { return 'src/' + s; }), { base: 'src/' })
    .pipe(cached('everyfiles'))
    .pipe(filelog())
    .pipe(plumber())
    .pipe(jsFilter)
    .pipe(to6({
      runtime: true,
      experimental: true,
      sourceMap: true
    }))
    .pipe(wrapper({
      header: function(file) { return ['',
        '/**',
        ' *',
        ' * THIS IS A GENERATED FILE',
        ' * source: ' + file.base + file.relative,
        ' */',
        '\n'].join('\n');
      }
    }))
    .pipe(jsFilter.restore())
    .pipe(plumber.stop())
    .pipe(gulp.dest('.'));
});

gulp.task('download/es7polyfill', function() {
  const url6 = 'https://raw.githubusercontent.com/inexorabletash/polyfill/master/es6.js';
  const url7 = 'https://raw.githubusercontent.com/inexorabletash/polyfill/master/experimental/es7.js';
  const es7polyfillName = 'es7polyfill.js';

  const literal = require('string-to-stream');
  const series = require('stream-series');
  const request = require('request');
  const source = require('vinyl-source-stream');

  return series([
    literal('/* FETCHED FROM inexorabletash/polyfill/master/{es6,experimental/es7}.js on GitHub */\n\n'),
    literal('(function() {\n'),
    request(url6),
    request(url7),
    literal('}).call(global)')
  ])
    .pipe(source(es7polyfillName))
    .pipe(filelog())
    .pipe(gulp.dest('./lib/'));
});

gulp.task('watch', function() {
  gulp.watch('src/**/*', ['compile/src']);
});

gulp.task('clean', function() {
  const rimraf = require('gulp-rimraf');
  return gulp.src(rmFiles, { read: false })
    .pipe(rimraf());
});

gulp.task('default', ['watch', 'compile/src']);
