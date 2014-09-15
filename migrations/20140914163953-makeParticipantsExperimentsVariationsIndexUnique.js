var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'participant_experiment_variation',
        'idx_participant_id_experiment_id'
      ),

      db.addIndex.bind(
        db,
        'participant_experiment_variation',
        'idx_participant_id_experiment_id_unique',
        ['participant_id', 'experiment_id'],
        true
      )

    ], callback);
};

exports.down = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'participant_experiment_variation',
        'idx_participant_id_experiment_id_unique'
      ),

      db.addIndex.bind(
        db,
        'participant_experiment_variation',
        'idx_participant_id_experiment_id',
        ['participant_id', 'experiment_id']
      )

    ], callback);
};
