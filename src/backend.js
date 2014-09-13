'use strict';

var util = require('util');
var async = require('async');
var Percolator = require('percolator').Percolator;

var init = function(dbWrapper, port, generateHash) {

  var server = Percolator({'port': port});

  server.route(
    '/experiments',

    {
      POST: function(req, res) {

        req.onJson(function(err, obj) {
          if (err) {
            util.error(err);
            return res.status.internalServerError();
          }

          dbWrapper.fetchRow('SELECT COUNT(*) AS cnt FROM experiment WHERE name = ?', [obj.name], function(err, result) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }

            if (result['cnt'] > 0) {
              return res.status.badRequest('An experiment with this name already exists');
            } else {
              var experimentData = { 'name': obj.name, 'scope': obj.scope };
              dbWrapper.insert('experiment', experimentData, function(err) {
                if (err) {
                  util.error(err);
                  return res.status.internalServerError();
                }
                var experimentId = dbWrapper.getLastInsertId();

                var variationInsertFunctions = [];
                for (var i=0; i < obj.variations.length; i++) {
                  var variationData = {
                    'experiment_id': experimentId,
                    'name': obj.variations[i].name,
                    'weight': obj.variations[i].weight,
                  };
                  var params = obj.variations[i].params;
                  variationInsertFunctions.push(
                    function(variationData, params, callback) {
                      dbWrapper.insert('variation', variationData, function(err) {
                        if (err) {
                          util.error(err);
                          callback(err);
                        }

                        var variationId = dbWrapper.getLastInsertId();

                        var paramInsertFunctions = [];
                        for (var i=0; i < params.length; i++) {
                          var paramData = {
                            'variation_id': variationId,
                            'name': params[i].name,
                            'value': params[i].value
                          };
                          paramInsertFunctions.push(
                            function(paramData, callback) {
                              dbWrapper.insert('param', paramData, function(err) {
                                if (err) {
                                  util.error(err);
                                }
                                callback(err);
                              });
                            }.bind(this, paramData)
                          );
                        }

                        async.parallel(paramInsertFunctions, function(err, results) {
                          if (err) {
                            return res.status.internalServerError('Could not store params');
                          }
                          callback(err);
                        });

                      });
                    }.bind(this, variationData, params)
                  );
                }

                async.parallel(variationInsertFunctions, function(err, results) {
                  if (err) {
                    return res.status.internalServerError('Could not store variations');
                  }

                  var body = {
                    'status': 'success',
                    'experimentId': experimentId
                  };
                  res.object(body).send();
                });
              });
            }

          });

        });
      }
    }
  );

  server.route(
    '/participants',

    {
      POST: function (req, res) {

          var hash = generateHash();

          var data = { 'hash': hash };

          dbWrapper.insert('participant', data, function (err) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }
            var body = {
              'status': 'success',
              'participantHash': hash
            };
            res.object(body).send();

          });

      }
    }
  );

  server.route(
    '/participants/:hash/decisionsets',

    {
      GET: function (req, res) {
        var hash = req.uri.parent().child();

        dbWrapper.fetchOne('SELECT id FROM participant WHERE hash = ?', [hash], function(err, participantId) {
          if (err) {
            util.error(err);
            return res.status.internalServerError();
          }

          if (participantId === null) {
            return res.status.notFound('A participant with hash ' + hash + ' does not exist');
          }

          mapParticipantWhereDue(dbWrapper, participantId, function() {
            dbWrapper.fetchAll(
              ' SELECT experiment.name, variation_id' +
              ' FROM participant_experiment_variation' +
              '  INNER JOIN experiment' +
              '   ON (experiment.id = participant_experiment_variation.experiment_id)' +
              ' WHERE participant_id = ?' +
              '  AND variation_id IS NOT NULL',
              [participantId],
              function(err, results) {
                if (err) {
                  util.error(err);
                  return res.status.internalServerError();
                }
                var paramSelectFunctions = []
                for (var i=0; i < results.length; i++) {
                  paramSelectFunctions.push(
                    function(variationId, experimentName, callback) {
                      dbWrapper.fetchAll('SELECT name, value FROM param WHERE variation_id = ?', [variationId], function(err, results) {
                        if (err) {
                          util.error(err);
                          callback(err);
                        } else {
                          var params = {};
                          for (var i=0; i < results.length; i++) {
                            params[results[i].name] = results[i].value;
                          }
                          callback(null, { 'experimentName': experimentName, 'params': params });
                        }
                      });
                    }.bind(this, results[i].variation_id, results[i].name)
                  );
                }

                async.parallel(paramSelectFunctions, function(err, results) {
                  if (err) {
                    util.error(err);
                    return res.status.internalServerError();
                  } else {
                    var body = {
                      'status': 'success',
                      'decisionsets': results
                    };
                    res.object(body).send();
                  }
                });

              }
            );
          });

        });
      }

    }

  );

  return server;
};

var mapParticipantWhereDue = function(dbWrapper, participantId, callback) {

  // Get all experiment id's which are not yet mapped to this participant
  dbWrapper.fetchAll(
    ' SELECT experiment.id' +
    ' FROM experiment' +
    '  LEFT JOIN participant_experiment_variation' +
    '   ON (experiment.id = experiment_id AND participant_id = ?)' +
    ' WHERE participant_experiment_variation.id IS NULL;',
    [participantId],
    function(err, results) {
      if (err) {
        util.error(err);
        callback(err);
      } else {
        if (results.length > 0) {
          var functions = [];
          for (var i = 0; i < results.length; i++) {
            functions.push(
              function (experimentId, callback) {
                mapParticipantToExperiment(dbWrapper, participantId, experimentId, callback);
              }.bind(this, results[i].id)
            );
          }

          async.parallel(functions, function (err, results) {
            if (err) {
              util.error(err);
            }
            callback(err);
          });
        } else {
          callback(null);
        }
      }

    });

};

var mapParticipantToExperiment = function(dbWrapper, participantId, experimentId, callback) {

  var writeMapping = function(participantId, experimentId, variationId, callback) {
    dbWrapper.insert(
      'participant_experiment_variation',
      {
        'participant_id': participantId,
        'experiment_id': experimentId,
        'variation_id': variationId
      },
      function(err) {
        if (err) {
          util.error(err);
        }
        callback(err);
      }
    );
  };

  dbWrapper.fetchRow('SELECT * FROM experiment WHERE id = ?', [experimentId], function(err, result) {
    if (err) {
      util.error(err);
      callback(err);
    } else {
      // Will this participant be part in this experiment?
      if (Math.random() * 100.0 > result.scope) {
        // No
        writeMapping(participantId, experimentId, null, function(err) {
          callback(err);
        });
      } else {
        // Yes - Which variation?
        dbWrapper.fetchAll('SELECT * FROM variation WHERE experiment_id = ? ORDER BY id', [experimentId], function(err, results) {
          var variationId;
          if (err) {
            util.error(err);
            callback(err);
          } else {
            if (results.length === 0) {
              callback(new Error('Experiment ' + experimentId + ' does not have any variations!'));
            } else {
              var weightSum = 0;
              for (var i = 0; i < results.length; i++) {
                results[i].accumulatedWeight = results[i].weight + weightSum;
                weightSum = weightSum + results[i].weight;
              }
              var rand = Math.random() * 100.0;
              var lastAccumulatedWeight = 0;
              for (var i = 0; i < results.length; i++) {
                if (rand > lastAccumulatedWeight && rand <= results[i].accumulatedWeight) {
                  variationId = results[i].id;
                  lastAccumulatedWeight = results[i].accumulatedWeight;
                }
              }
              writeMapping(participantId, experimentId, variationId, function(err) {
                callback(err);
              });
            }
          }
        });
      }
    }
  });
};

module.exports = { 'init': init };
