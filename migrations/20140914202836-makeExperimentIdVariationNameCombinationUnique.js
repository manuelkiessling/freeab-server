var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'variation',
        'fk_variation_experiment_1'
      ),

      db.addIndex.bind(
        db,
        'variation',
        'idx_experiment_id_name_unique',
        ['experiment_id', 'name'],
        true
      )

    ], callback);
};

exports.down = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'variation',
        'idx_experiment_id_name_unique'
      ),

      db.addIndex.bind(
        db,
        'variation',
        'fk_variation_experiment_1',
        'experiment_id'
      )

    ], callback);
};
