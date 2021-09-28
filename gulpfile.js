const gulp = require("gulp");
const mapapps = require('ct-mapapps-gulp-js');

mapapps.registerTasks({});

gulp.task("default",
    gulp.series(
        "copy-resources",
        "themes-copy",
        gulp.parallel(
            "js-lint",
            //"style-lint",
            "js-transpile",
            "themes-compile"
        )
    )
);

gulp.task("compress",
    gulp.series(
        "default",
        "themes-compress"
    )
);
