'use strict';

var env = require('./env');

var DBWrapper = require('node-dbi').DBWrapper;

var dbOptions = require('../database.json')[env];

var dbWrapper;

if (dbOptions.driver === 'sqlite3') {
  dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions.filename});
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
  throw(new Error('No suitable database config found.'));
}

module.exports = dbWrapper;
