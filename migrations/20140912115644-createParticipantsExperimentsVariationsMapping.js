var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  async.series(
    [

      db.createTable.bind(db, 'participant_experiment_variation', {
        id: { type: 'int', primaryKey: true, autoIncrement: true, notNull: true },
        participant_id: { type: 'int', notNull: true },
        experiment_id: { type: 'int', notNull: true },
        variation_id: { type: 'int', notNull: false }
      }),

      db.addIndex.bind(db, 'participant_experiment_variation', 'idx_participant_id_experiment_id', ['participant_id', 'experiment_id'])

    ], callback);
};

exports.down = function(db, callback) {
  db.dropTable('participant_experiment_variation');
  callback();
};
