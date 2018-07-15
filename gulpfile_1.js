var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var concat = require('gulp-concat');
var uglifyes = require('gulp-uglify');
var uglify = require('gulp-uglifyes');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var gzip = require('gulp-gzip');
var pump = require('pump');


gulp.task('copy-html', function(done) {
    gulp.src('./*.html')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.stream());
    done();
});

gulp.task('copy-images', function(done) {
    gulp.src('./img/*')
        .pipe(gulp.dest('./dist/img'));
    done();
});

gulp.task('copy-sw', function(done) {
    gulp.src('./sw.js')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.stream());
    done();
});


gulp.task('copy-ww', function(done) {
    gulp.src('./ww.js')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.stream());
    done();
});


gulp.task('styles', function(done) {
    gulp.src('./sass/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/css'))
        .pipe(browserSync.stream());
    done();
});

gulp.task('styles-dist', function(done) {
    gulp.src('./sass/**/*.scss')
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(gulp.dest('./dist/css'))
        .pipe(browserSync.stream());
    done();
});

gulp.task('scripts', function(done) {
    gulp.src('./js/*.js')
        .pipe(sourcemaps.init())
        .pipe(concat('all.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js'));
    done();
});

gulp.task('scripts-dist', function(done) {
    pump([
        gulp.src('./js/*.js'),
        concat('all.js'),
        uglify({ 
            mangle: false, 
            ecma: 6 
        }),
        gulp.dest('./dist/js')
    ],
    done()
    );
});

gulp.task('watch:styles', function() {
    gulp.watch('./sass/**/*.scss', gulp.series('styles'));
});

gulp.task('watch:scripts', function() {
    gulp.watch('./js/**/*.js', gulp.series('scripts'));
});

gulp.task('watch:copy-html', function() {
    gulp.watch('./*.html', gulp.series('copy-html'));
});

gulp.task('watch:copy-images', function() {
    gulp.watch('./img/*', gulp.series('copy-images'));
});

gulp.task('watch:copy-sw', function() {
    gulp.watch('./sw.js', gulp.series('copy-sw'));
});

gulp.task('watch:copy-ww', function() {
    gulp.watch('./ww.js', gulp.series('copy-ww'));
});

gulp.task('watch', gulp.series('copy-html','copy-images','styles','scripts','copy-sw','copy-ww', gulp.parallel('watch:styles','watch:scripts','watch:copy-html','watch:copy-images','watch:copy-sw','watch:copy-ww')));

gulp.task('dist', gulp.series('copy-html','copy-images','copy-sw','copy-ww','styles-dist','scripts-dist', function(done) {
    done(); 
}));

gulp.task('default', gulp.series('copy-html','copy-images','copy-sw','copy-ww','styles','scripts','watch', function(done) {
    browserSync.init({
        server: './dist'
    });
    done();
}));



