'use strict';

var env = require('../src/env.js');
var dbOptions = require('../database.json')[env];
var dbWrapper = require('../src/database');
var async = require('async');

var resetDatabase = function(callback) {
  if (dbOptions.driver === 'sqlite3') {

    async.series(
      [
        function(callback) {
          dbWrapper.remove('experiment', '1', function (err) {
            callback(err);
          });
        },
        function(callback) {
          dbWrapper.remove('sqlite_sequence', '1', function (err) {
            callback(err, null);
          });
        }
      ],
      function(err, results) {
        callback(err);
      }
    );

  } else if (dbOptions.driver === 'mysql') {

    async.series(
      [
        function(callback) {
          dbWrapper.fetchOne('TRUNCATE experiment', [], function(err, result) {
            callback(err, null);
          });
        },
        function(callback) {
          dbWrapper.fetchOne('TRUNCATE experiment', [], function(err, result) {
            callback(err, null);
          });
        }
      ],
      function(err, results) {
        callback(err);
      }
    );

  }
}

module.exports = resetDatabase;
