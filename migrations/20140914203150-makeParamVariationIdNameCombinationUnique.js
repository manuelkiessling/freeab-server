var dbm = require('db-migrate');
var type = dbm.dataType;
var async = require('async');

exports.up = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'param',
        'fk_param_variation_1'
      ),

      db.addIndex.bind(
        db,
        'param',
        'idx_variation_id_name_unique',
        ['variation_id', 'name'],
        true
      )

    ], callback);
};

exports.down = function(db, callback) {
  async.series(
    [

      db.removeIndex.bind(
        db,
        'param',
        'idx_variation_id_name_unique'
      ),

      db.addIndex.bind(
        db,
        'param',
        'fk_param_variation_1',
        'variation_id'
      )

    ], callback);
};
