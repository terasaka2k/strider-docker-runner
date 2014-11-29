/* eslint-env node */
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const to6 = require('gulp-6to5');
const filter = require('gulp-filter');
const cached = require('gulp-cached');
const clean = require('gulp-clean');
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

gulp.task('build', function() {
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

gulp.task('watch', function() {
  gulp.watch('src/**/*', ['build']);
});

gulp.task('clean', function() {
  return gulp.src(rmFiles, {read: false})
    .pipe(clean());
});

gulp.task('default', ['watch', 'build']);
