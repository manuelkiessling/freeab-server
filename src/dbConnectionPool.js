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
      util.error('>>>>>>>>>>>>>>>>>>>>>> No suitable database config found.');
      throw(new Error('No suitable database config found.'));
    }
    dbWrapper.connect(function() {
      util.log('++++++++++++++++++++++++++ Created new database connection');
      dbWrapper._adapter._dbClient.on('error', function(err) {
        util.log('xxxxxxxxxxxxxxxxxxxxxxxxxx');
        util.log(err);
      });
      callback(null, dbWrapper);
    });
  },
  'destroy': function(dbWrapper) {
    dbWrapper.close(function() {
      util.log('-------------------------- Closed database connection');
    });
  },
  returnToHead: false,
  max: 90,
  idleTimeoutMillis: 30000,
  log: false
});


/*
var connections = [];

for (var i=0; i < 50; i++) {
  if (dbOptions.driver === 'sqlite3') {
    connections[i] = new DBWrapper('sqlite3', {'path': dbOptions.filename});
  } else if (dbOptions.driver === 'mysql') {
    connections[i] = new DBWrapper('mysql', {
      'host': dbOptions.host,
      'user': dbOptions.user,
      'password': dbOptions.password,
      'database': dbOptions.database
    });
  } else {
    util.error('>>>>>>>>>>>>>>>>>>>>>> No suitable database config found.');
    throw(new Error('No suitable database config found.'));
  }
  util.log('++++++++++++++++++++++++++ Creating new database connection ' + i);
  connections[i].connect(function(i) {
    util.log('++++++++++++++++++++++++++ Created new database connection ' + i);
  }.bind(connections[i], i));
}

var pool = {
  acquire: function(key, callback) {
    if (key === 'decisionsets') {
      var id = Math.round(Math.random()*25);
    } else {
      var id = Math.round(Math.random()*25)+25;
    }
    util.log('++++++++++++++++++++++++++ Aquired database connection ' + id + ' for ' + key);
    callback(null, connections[id]);
  },
  release: function(dbWrapper) {
    util.log('-------------------------- Released database connection');
  }
};
*/
module.exports = pool;
