// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var bower  = require('gulp-bower');
var inject = require('gulp-inject');
var clean  = require('gulp-clean');
var filter = require('gulp-filter');
var install = require('gulp-install');
var run = require('gulp-run');

gulp.task('clean-dest', function () {
	return gulp.src(['build/**/*'], {read: false})
    	.pipe(clean({force: false}));
	});

gulp.task('scripts', function() {
    return gulp.src('src/js/*.js')
        .pipe(concat('pdfsign.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('clean', function(){
	return gulp.src(['bower_components/forge/js/pkcs7.js'])
            .pipe(clean());
});

gulp.task('patch-pkcs7', ['clean'], function(){
	return gulp.src('src/lib/pkcs7-detached.js')
            .pipe(rename("pkcs7.js"))
            .pipe(gulp.dest('bower_components/forge/js/'));
});

gulp.task('patch2', [], function(){
	return gulp.src(['src/lib/pdfjs/shared/global.js', 
            'src/lib/pdfjs/shared/util.js',
            'src/lib/pdfjs/core/chunked_stream.js',
            'src/lib/pdfjs/core/primitives.js',
            'src/lib/pdfjs/core/stream.js',
            'src/lib/pdfjs/core/parser.js',
            'src/lib/pdfjs/core/crypto.js',
            'src/lib/pdfjs/core/obj.js',
            'src/lib/pdfjs/core/document.js'])
            .pipe(concat('pdfjs.parser.js'))
            .pipe(gulp.dest('build/lib'));
});

gulp.task('install', ['patch-pkcs7'], function(){
	return gulp.src('bower_components/forge/bower.json')
            .pipe(gulp.dest('./'))
            .pipe(install())
            .pipe(run('cd bower_components/forge && npm run bundle'));
});

gulp.task('bower-files', ['install', 'patch2'], function() {
	var jsFilter = filter(['forge/js/forge.bundle.js']);
	return bower()
		.pipe(jsFilter)
		.pipe(concat('forge-patched.js'))
		.pipe(gulp.dest('build/lib'));
});

gulp.task('index', ['scripts', 'bower-files', 'clean-dest'], function () {
	return gulp.src('src/html/index.html')
	    .pipe(inject(gulp.src(['./build/lib/**', './build/*.js'], {read: false}), {relative: false, ignorePath: 'build', addRootSlash: false}))
	  	.pipe(gulp.dest('./build'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/**', ['scripts', 'bower-files', 'index']);
});

// Default Task
gulp.task('default', ['scripts', 'watch', 'bower-files', 'index']);