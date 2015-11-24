// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var bower  = require('gulp-bower');
var inject = require('gulp-inject');
var clean  = require('gulp-clean');
var filter = require('gulp-filter');

gulp.task('clean-dest', function () {
	return gulp.src(['/srv/http/pdfsign'], {read: false})
    	.pipe(clean({force: true}));
	});

gulp.task('scripts', function() {
    return gulp.src('src/js/*.js')
        .pipe(concat('pdfsign.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('bower-files', function(){
	var jsFilter = filter(['pdfjs-dist/build/pdf.combined.js', 'forge/js/*bundle*.js']);
	return bower()
		.pipe(jsFilter)
		.pipe(concat('libs.js'))
		.pipe(gulp.dest('build/lib'));
});

gulp.task('index', ['scripts', 'bower-files'], function () {
	return gulp.src('src/html/index.html')
	    .pipe(inject(gulp.src(['./build/lib/**', './build/*.js'], {read: false}), {relative: false, ignorePath: 'build', addRootSlash: false}))
	  	.pipe(gulp.dest('./build'));
});

gulp.task('copy', ['index', 'clean-dest'], function () {
	  return gulp.src('build/**')
	  	.pipe(gulp.dest('/srv/http/pdfsign'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/**', ['scripts', 'bower-files', 'index', 'copy']);
});

// Default Task
gulp.task('default', ['scripts', 'watch', 'bower-files', 'index', 'copy']);