var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  db.createTable('apikey', {
    id: { type: 'int', primaryKey: true, autoIncrement: true, notNull: true },
    apikey: { type: 'char', length: '64', notNull: true, unique: true }
  });
  callback();
};

exports.down = function(db, callback) {
  db.dropTable('apikey');
  callback();
};
