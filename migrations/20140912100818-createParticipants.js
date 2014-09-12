var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  db.createTable('participant', {
    id: { type: 'int', primaryKey: true, autoIncrement: true, notNull: true },
    hash: { type: 'char', length: '64', notNull: true, unique: true }
  });
  callback();
};

exports.down = function(db, callback) {
  db.dropTable('participant');
  callback();
};
