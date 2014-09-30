'use strict';

(function() {
  var util = require('util');
  var async = require('async');
  var Percolator = require('percolator').Percolator;
  var Cookies = require('cookies');
  var request = require('request');
  var async = require('async');
  var url = require('url');
  var querystring = require('querystring');

  var clientJsTemplate = require('./client.js.template');

  var init = function(dbConnectionPool, port, generateHash) {

    var server = Percolator({
      'port': port,
      'autoLink': false,
    });

    server.route(
      '/client.js',

      {
        GET: function(req, res) {

          // If failures occur, we pretend that all is fine and deliver an empty yet working client
          var sendEmptyClient = function(err) {
            var template = clientJsTemplate;
            var bodyObject = {
              'error': {
                'type': 400,
                'message': 'Bad request',
                'detail': err.toString()
              },
              'decisionsets': [],
              'trackingidentifiers': [],
              'variationidentifiers': []
            };
            template = template.replace('<PLACEHOLDER/>',  JSON.stringify(bodyObject, null, 2), 'gi');
            res.end(template);
          };

          var cookies = new Cookies(req, res);

          var query = url.parse(req.url).query;
          var cookieDomain = querystring.parse(query)['cookieDomain'];
          if (cookieDomain === undefined) {
            cookieDomain = '';
          }

          async.waterfall(
            [

              function(callback) {
                var participantHash = cookies.get('freeab_participantHash');
                if (!participantHash) {
                  request.post(
                    {
                      'url': 'http://localhost:' + port + '/api/participants/',
                      'json': true
                    },
                    function(err, postRes, body) {
                      if (err) {
                        util.error(err);
                        return callback(err);
                      }
                      return callback(null, body.participantHash);
                    }
                  );
                } else {
                  callback(null, participantHash);
                }
              },

              // Verify that this participantHash is known
              function(participantHash, callback) {
                dbConnectionPool.acquire(function(err, dbConnection) {
                  if (err) {
                    util.error(err);
                    dbConnectionPool.release(dbConnection);
                    return callback(err);
                  }
                  dbConnection.fetchRow('SELECT COUNT(*) AS cnt FROM participant WHERE hash = ?', [participantHash], function(err, result) {
                    dbConnectionPool.release(dbConnection);
                    if (err) {
                      util.error(err);
                      return callback(err);
                    }
                    if (result['cnt'] != 1) {
                      return callback(new Error('Could not find participant with hash ' + participantHash + ' in database.'));
                    }
                    return callback(null, participantHash);
                  });
                });
              },

              function(participantHash, callback) {
                var targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + 30);
                cookies.set(
                  'freeab_participantHash',
                  participantHash,
                  {
                    'expires': targetDate,
                    'domain': cookieDomain,
                    'httpOnly': false
                  }
                );
                request.get(
                  {
                    'url': 'http://localhost:' + port + '/api/participants/' +  participantHash,
                    'json': false
                  },
                  function(err, getRes, body) {
                    if (err) {
                      util.error(err);
                      return callback(err);
                    }
                    var template = clientJsTemplate;
                    var bodyObject = JSON.parse(body);
                    template = template.replace('<PLACEHOLDER/>',  JSON.stringify(bodyObject, null, 2), 'gi');
                    res.end(template);
                    return callback(null);
                  }
                );
              }

            ],

            function(err, result) {
              if (err) {
                return sendEmptyClient(err);
              }
            }
          );

        }
      }
    );

    server.route(
      '/api/experiments',

      {
        authenticate: function(req, res, callback) {
          var apiKey = req.headers['x-api-key'];
          dbConnectionPool.acquire(function(err, dbConnection) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }
            dbConnection.fetchOne('SELECT COUNT(id) AS cnt FROM apikey WHERE apikey = ?', [apiKey], function(err, cnt) {
              dbConnectionPool.release(dbConnection);
              if (cnt === 1) {
                callback(false, apiKey);
              } else {
                callback(true);
              }
            });
          });
        },

        POST: function(req, res) {

          req.onJson(function(err, obj) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }

            if (obj['name'] === undefined) {
              return res.status.badRequest('An experiment needs a name');
            }

            if (obj['name'] === '') {
              return res.status.badRequest('The name of an experiment must not be empty');
            }

            if (obj.variations.length < 2) {
              return res.status.badRequest('An experiment needs at least 2 variations');
            }

            if (obj['scope'] === undefined) {
              return res.status.badRequest('An experiment needs a scope');
            }

            dbConnectionPool.acquire(function(err, dbConnection) {
              if (err) {
                util.error(err);
                dbConnectionPool.release(dbConnection);
                return res.status.internalServerError();
              }
              dbConnection.fetchRow('SELECT COUNT(*) AS cnt FROM experiment WHERE name = ?', [obj.name], function(err, result) {
                if (err) {
                  util.error(err);
                  dbConnectionPool.release(dbConnection);
                  return res.status.internalServerError();
                }

                if (result['cnt'] > 0) {
                  dbConnectionPool.release(dbConnection);
                  return res.status.badRequest('An experiment with this name already exists');
                } else {
                  var experimentData = { 'name': obj.name, 'scope': obj.scope };
                  dbConnection.insert('experiment', experimentData, function(err) {
                    if (err) {
                      util.error(err);
                      dbConnectionPool.release(dbConnection);
                      return res.status.internalServerError();
                    }
                    var experimentId = dbConnection.getLastInsertId();

                    var variationInsertFunctions = [];
                    var sumOfVariationWeights = 0;

                    for (var i=0; i < obj.variations.length; i++) {
                      if (obj.variations[i].name === undefined) {
                        dbConnectionPool.release(dbConnection);
                        return res.status.badRequest('Variations must have a name');
                      }
                      if (obj.variations[i].name === '') {
                        dbConnectionPool.release(dbConnection);
                        return res.status.badRequest('Variations must have a non-empty name');
                      }
                      if (obj.variations[i].params === undefined) {
                        dbConnectionPool.release(dbConnection);
                        return res.status.badRequest('Variation "' + obj.variations[i].name + '" does not have params');
                      }
                      if (obj.variations[i].params.length === 0) {
                        dbConnectionPool.release(dbConnection);
                        return res.status.badRequest('Variation "' + obj.variations[i].name + '" has empty params');
                      }
                      var variationData = {
                        'experiment_id': experimentId,
                        'name': obj.variations[i].name,
                        'weight': obj.variations[i].weight,
                      };
                      sumOfVariationWeights += obj.variations[i].weight;
                      var params = obj.variations[i].params;
                      variationInsertFunctions.push(
                        function(variationData, params, callback) {
                          dbConnection.insert('variation', variationData, function(err) {
                            if (err) {
                              util.error(err);
                              callback(err);
                            } else {
                              var variationId = dbConnection.getLastInsertId();
                              var paramInsertFunctions = [];
                              for (var i = 0; i < params.length; i++) {
                                if (params[i].name === undefined || params[i].value === undefined) {
                                  dbConnectionPool.release(dbConnection);
                                  return res.status.badRequest('Variation "' + variationData.name + '" has params without name/value');
                                }
                                var paramData = {
                                  'variation_id': variationId,
                                  'name': params[i].name,
                                  'value': params[i].value
                                };
                                paramInsertFunctions.push(
                                  function (paramData, callback) {
                                    dbConnection.insert('param', paramData, function (err) {
                                      if (err) {
                                        util.error(err);
                                      }
                                      callback(err);
                                    });
                                  }.bind(this, paramData)
                                );
                              }

                              async.parallel(paramInsertFunctions, function (err, results) {
                                if (err) {
                                  util.error(err);
                                  dbConnectionPool.release(dbConnection);
                                  return res.status.internalServerError('Could not store params');
                                }
                                callback(err);
                              });
                            }
                          });
                        }.bind(this, variationData, params)
                      );
                    }

                    if (sumOfVariationWeights != 100.0) {
                      dbConnectionPool.release(dbConnection);
                      return res.status.badRequest('The sum of the variation weights must be 100.0');
                    }

                    async.parallel(variationInsertFunctions, function(err, results) {
                      if (err) {
                        util.error(err);
                        dbConnectionPool.release(dbConnection);
                        return res.status.internalServerError('Could not store variations');
                      }

                      var body = {
                        'status': 'success',
                        'experimentId': experimentId
                      };
                      dbConnectionPool.release(dbConnection);
                      res.object(body).send();
                    });
                  });
                }

              });
            });
          });
        }
      }
    );

    server.route(
      '/api/participants',

      {
        POST: function (req, res) {
          var hash = generateHash();
          var data = { 'hash': hash };

          dbConnectionPool.acquire(function(err, dbConnection) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }
            else {
              dbConnection.insert('participant', data, function (err) {
                if (err) {
                  util.error(err);
                  dbConnectionPool.release(dbConnection);
                  return res.status.internalServerError();
                }
                var body = {
                  'status': 'success',
                  'participantHash': hash
                };
                dbConnectionPool.release(dbConnection);
                res.object(body).send();
              });
            }
          });
        }

      }
    );

    server.route(
      '/api/participants/:hash',

      {
        GET: function (req, res) {
          dbConnectionPool.acquire(function(err, dbConnection) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }
            var hash = req.uri.child();

            dbConnection.fetchOne('SELECT id FROM participant WHERE hash = ?', [hash], function (err, participantId) {
              if (err) {
                util.error(err);
                dbConnectionPool.release(dbConnection);
                return res.status.internalServerError();
              }

              if (participantId === null) {
                dbConnectionPool.release(dbConnection);
                return res.status.notFound('A participant with hash ' + hash + ' does not exist');
              }

              mapParticipantWhereDue(dbConnection, participantId, function () {
                dbConnection.fetchAll(
                  ' SELECT experiment.id, experiment.name, variation_id, variation.name AS vn' +
                  ' FROM participant_experiment_variation' +
                  '  INNER JOIN experiment' +
                  '   ON (experiment.id = participant_experiment_variation.experiment_id)' +
                  '  INNER JOIN variation' +
                  '   ON (variation.id = participant_experiment_variation.variation_id)' +
                  ' WHERE participant_id = ?' +
                  '  AND variation_id IS NOT NULL',
                  [participantId],
                  function (err, results) {
                    if (err) {
                      util.error(err);
                      dbConnectionPool.release(dbConnection);
                      return res.status.internalServerError();
                    }
                    var variationidentifiers = [];
                    var paramSelectFunctions = []
                    for (var i = 0; i < results.length; i++) {
                      variationidentifiers.push(results[i].variation_id);
                      paramSelectFunctions.push(
                        function (variationId, variationName, experimentId, experimentName, callback) {
                          dbConnection.fetchAll('SELECT name, value FROM param WHERE variation_id = ?', [variationId], function (err, results) {
                            if (err) {
                              util.error(err);
                              callback(err);
                            } else {
                              var params = {};
                              for (var i = 0; i < results.length; i++) {
                                params[results[i].name] = results[i].value;
                              }
                              callback(null, {
                                'experimentName': experimentName,
                                'experimentId': experimentId,
                                'variationName': variationName,
                                'variationId': variationId,
                                'params': params
                              });
                            }
                          });
                        }.bind(this, results[i].variation_id, results[i].vn, results[i].id, results[i].name)
                      );
                    }

                    async.parallel(paramSelectFunctions, function (err, results) {
                      if (err) {
                        util.error(err);
                        dbConnectionPool.release(dbConnection);
                        return res.status.internalServerError();
                      } else {
                        var trackingidentifiers = [];
                        for (var i=0; i < results.length; i++) {
                          trackingidentifiers.push(
                            (
                              'freeab_'
                              + encodeURIComponent(results[i].experimentName.replace(/ /g, '-'))
                              + '_'
                              + encodeURIComponent(results[i].variationName.replace(/ /g, '-'))
                            ).toLowerCase()
                          );
                        }
                        var body = {
                          'status': 'success',
                          'decisionsets': results,
                          'trackingidentifiers': trackingidentifiers,
                          'variationidentifiers': variationidentifiers
                        };
                        dbConnectionPool.release(dbConnection);
                        res.object(body).send();
                      }
                    });

                  }
                );
              });
            });
          });
        }

      }

    );

    return server;
  };

  var mapParticipantWhereDue = function(dbConnection, participantId, callback) {

    // Get all experiment id's which are not yet mapped to this participant
    dbConnection.fetchAll(
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
                  mapParticipantToExperiment(dbConnection, participantId, experimentId, callback);
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

  var mapParticipantToExperiment = function(dbConnection, participantId, experimentId, callback) {

    var writeMapping = function(participantId, experimentId, variationId, callback) {
      try {
        dbConnection.insert(
          'participant_experiment_variation',
          {
            'participant_id': participantId,
            'experiment_id': experimentId,
            'variation_id': variationId
          },
          function (err) {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') {
                util.log(
                  'The following message is not critical. It occurs if ' +
                  'for a participant more than one experiment mapping occured in parallel.');
                util.log(err);
                err = null;
              } else {
                util.error(err);
              }
            }
            callback(err);
          }
        );
      } catch (err) {
        callback(null);
      }
    };

    dbConnection.fetchRow('SELECT * FROM experiment WHERE id = ?', [experimentId], function(err, result) {
      if (err) {
        util.error(err);
        callback(err);
      } else {
        // Will this participant be part of this experiment?
        if (Math.random() * 100.0 >= result.scope) {
          // No
          writeMapping(participantId, experimentId, null, function(err) {
            callback(err);
          });
        } else {
          // Yes - Which variation?
          dbConnection.fetchAll('SELECT * FROM variation WHERE experiment_id = ? ORDER BY id', [experimentId], function(err, results) {
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
                  if (rand >= lastAccumulatedWeight && rand < results[i].accumulatedWeight) {
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
})();
