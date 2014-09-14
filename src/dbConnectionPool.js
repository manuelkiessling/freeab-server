'use strict';

var env = require('./env');
var util = require('util');
var poolModule = require('generic-pool');
var DBWrapper = require('node-dbi').DBWrapper;
var dbOptions = require('../database.json')[env];

var pool = poolModule.Pool({
  'name': 'dbWrapper',
  'create': function(callback) {
    var dbWrapper;
    if (dbOptions.driver === 'sqlite3') {
      dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions.filename});
    } else if (dbOptions.driver === 'mysql') {
      dbWrapper = new DBWrapper('mysql', {
        'host': dbOptions.host,
        'user': dbOptions.user,
        'password': dbOptions.password,
        'database': dbOptions.database
      });
    } else {
      util.error('No suitable database config found.');
      throw(new Error('No suitable database config found.'));
    }
    dbWrapper.connect(function() {
      dbWrapper._adapter._dbClient.on('error', function(err) {
        util.log('xxxxxxxxxxxxxxxxxxxxxxxxxx');
        util.log(err);
      });
      callback(null, dbWrapper);
    });
  },
  'destroy': function(dbWrapper) {
    dbWrapper.close(function() {});
  },
  returnToHead: false,
  max: 90,
  idleTimeoutMillis: 30000,
  log: false
});

module.exports = pool;
