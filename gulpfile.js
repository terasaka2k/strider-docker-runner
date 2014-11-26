/* eslint-env node */
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const to6 = require('gulp-6to5');
const filter = require('gulp-filter');
const cached = require('gulp-cached');
const clean = require('gulp-clean');
const filelog = require('gulp-filelog');

const files = [
  'config', 'config/**/*',
  'static', 'static/**/*',
  'lib', 'lib/**/*',
  'index.js'
];

gulp.task('build', function() {
  const jsFilter = filter('**/*.js');

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
    .pipe(jsFilter.restore())
    .pipe(plumber.stop())
    .pipe(gulp.dest('.'));
});

gulp.task('watch', function() {
  gulp.watch('src/**/*', ['build']);
});

gulp.task('clean', function() {
  return gulp.src(files, {read: false})
    .pipe(clean());
});

gulp.task('default', ['watch', 'build']);
