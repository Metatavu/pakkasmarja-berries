/*global module:false*/

const fs = require('fs');
const util = require('util');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  
  grunt.initConfig({
    'sass': {
      client: {
        options: {
          style: 'compressed'
        },
        files: [{
          expand: true,
          cwd: 'client-src/scss',
          src: ['**/*.scss'],
          dest: 'public/css',
          ext: '.min.css'
        }]
      }
    }
  });
  
  grunt.registerTask('default', [ 'sass:client' ]);
};