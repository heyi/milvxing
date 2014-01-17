/* global require, module, process */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/**\n' +
      ' * <%= pkg.description %>\n' +
      ' * @version v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
      ' * @author <%= pkg.author %>\n**/'
    },
    dirs: {
      dest: 'dist'
    },
    concat: {
      options: {
        banner: '<%= meta.banner %>'
      },
      dist: {
        src: ['lib/browser.js', 'lib/angular/angular.js',"lib/angular/angular-route.js", "lib/angular/angular-touch.js", "lib/angular/angular-animate.js", "lib/angular/angular-sanitize.js", "lib/angular-carousel/angular-mobile.js","lib/angular-carousel/angular-carousel.js",  "lib/underscore.js", "lib/restangular.js", "lib/iscroll-probe.js", "lib/date.js", "lib/app.js"],
        dest: '<%= dirs.dest %>/<%= pkg.name %>.js'
      }
    },
    cssmin: {
      combine: {
        files: {
          '<%= dirs.dest %>/<%= pkg.name %>.min.css': ['css/bootstrap.min.css', 'css/app.css']
        }
      }
    },
    uglify: {
      options: {
        banner: '<%= meta.banner %>', 
        beautify: false, 
        mangle: false
      },
      dist: {
        src: ['<%= concat.dist.dest %>'],
        dest: '<%= dirs.dest %>/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
      files: ['Gruntfile.js'],
      options: {
        curly: false,
        browser: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        expr: true,
        node: true,
        globals: {
          exports: true,
          angular: false,
          $: false
        }
      }
    }
    // watch: {
    //   files: ['src/**'],
    //   tasks: ['quickbuild']
    // }
  });

  // Load the plugin that provides the "jshint" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Load the plugin that provides the "concat" task.
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.loadNpmTasks('grunt-contrib-cssmin');

  // Load the plugin that provides the "watch" task.
  // grunt.loadNpmTasks('grunt-contrib-watch');

  // Build task.
  grunt.registerTask('build', ['jshint', 'concat', 'uglify', 'cssmin']);
  grunt.registerTask('quickbuild', ['jshint', 'concat', 'uglify', 'cssmin']);
};
