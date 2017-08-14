/*global module:false*/

const fs = require('fs');
const util = require('util');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  
  grunt.initConfig({
    'babel': {
      options: {
        sourceMap: true,
        minified: true
      },
      client: {
        files: [{
          expand: true,
          cwd: 'client-src/js',
          src: ['*.js'],
          dest: 'public/js',
          ext: '.js'
        }]
      }
    }
  });
  
  grunt.registerTask('default', [ 'babel:client' ]);
};