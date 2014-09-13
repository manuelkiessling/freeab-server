'use strict';

var env = require('./env');
var util = require('util');
var poolModule = require('generic-pool');
var DBWrapper = require('node-dbi').DBWrapper;
var dbOptions = require('../database.json')[env];

var pool = poolModule.Pool({
  'name': 'dbWrapper',
  'create': function(callback) {
    if (dbOptions.driver === 'sqlite3') {
      var dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions.filename});
      dbWrapper.connect();
    } else if (dbOptions.driver === 'mysql') {
      dbWrapper = new DBWrapper('mysql', {
        'host': dbOptions.host,
        'user': dbOptions.user,
        'password': dbOptions.password,
        'database': dbOptions.database
      });
      dbWrapper.connect();
    } else {
      util.error('>>>>>>>>>>>>>>>>>>>>>> No suitable database config found.');
      throw(new Error('No suitable database config found.'));
    }
    util.log('++++++++++++++++++++++++++ Created new database connection');
    callback(null, dbWrapper);
  },
  'destroy': function(dbWrapper) {
    util.log('-------------------------- Closed database connection');
    dbWrapper.close();
  },
  max: 1,
  idleTimeoutMillis: 10000000,
  log: true
});

module.exports = pool;
