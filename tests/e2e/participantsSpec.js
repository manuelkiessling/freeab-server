'use strict';

(function() {
  var dbConnectionPool = require('../../src/dbConnectionPool');
  var resetDatabase = require('../resetDatabase');
  var backend = require('../../src/backend');
  var async = require('async');
  var request = require('request');

  var theHash = 0;
  var generateHash = function () {
    return theHash;
  };

  var server = backend.init(dbConnectionPool, 8888, generateHash);

  describe('The participants API', function () {

    beforeEach(function (done) {
      resetDatabase(function () {
        server.listen(function (err) {
          done(err);
        });
      });
    });

    afterEach(function (done) {
      server.close(function () {
        done();
      });
    });

    it('should return a participantHash when being asked to add a new participant', function (done) {

      theHash = 1;

      request.post(
        {
          'url': 'http://localhost:8888/api/participants/',
          'json': true
        },
        function (err, res, body) {
          expect(res.statusCode).toBe(200);
          expect(body.status).toEqual('success');
          expect(body.participantHash).toEqual(1);
          done(err);
        }
      );

    });

    it('should return no data for a participant if no experiments exist', function (done) {

      theHash = 1;

      request.post(
        {
          'url': 'http://localhost:8888/api/participants/',
          'json': true
        },
        function (err, res, body) {

          request.get(
            {
              'url': 'http://localhost:8888/api/participants/1',
              'json': true
            },
            function (err, res, body) {
              expect(res.statusCode).toBe(200);
              expect(body.status).toEqual('success');
              expect(body.decisionsets).toEqual([]);
              done(err);
            }
          );

        }
      );

    });

    it('should return decisionsets for a participant if experiments exists', function (done) {

      async.series(
        [

          function (callback) {
            request.post(
              {
                'url': 'http://localhost:8888/api/experiments/',
                'body': {
                  'name': 'Experiment Number One',
                  'scope': 100.0,
                  'variations': [
                    {
                      'name': 'Group Number A',
                      'weight': 100.0,
                      'params': [
                        {
                          'name': 'ex-one-name',
                          'value': 'ex-one-a-value'
                        }
                      ]
                    },
                    {
                      'name': 'Group Number B',
                      'weight': 0.0,
                      'params': [
                        {
                          'name': 'ex-one-name',
                          'value': 'ex-one-b-value'
                        }
                      ]
                    }
                  ]
                },
                'json': true,
                'headers': {
                  'x-api-key': 'abcd'
                }
              },
              function (err, res, body) {
                callback(err);
              });
          },

          function (callback) {
            request.post(
              {
                'url': 'http://localhost:8888/api/experiments/',
                'body': {
                  'name': 'Experiment Number Two',
                  'scope': 100.0,
                  'variations': [
                    {
                      'name': 'Group Number A',
                      'weight': 0.0,
                      'params': [
                        {
                          'name': 'ex-two-name',
                          'value': 'ex-two-a-value'
                        }
                      ]
                    },
                    {
                      'name': 'Group Number B',
                      'weight': 100.0,
                      'params': [
                        {
                          'name': 'ex-two-name',
                          'value': 'ex-two-b-value'
                        }
                      ]
                    }
                  ]
                },
                'json': true,
                'headers': {
                  'x-api-key': 'abcd'
                }
              },
              function (err, res, body) {
                callback(err);
              });
          },

          function (callback) {
            request.post(
              {
                'url': 'http://localhost:8888/api/experiments/',
                'body': {
                  'name': 'Experiment Number Three',
                  'scope': 0.0,
                  'variations': [
                    {
                      'name': 'Group Number A',
                      'weight': 100.0,
                      'params': [
                        {
                          'name': 'ex-three-name',
                          'value': 'ex-three-a-value'
                        }
                      ]
                    },
                    {
                      'name': 'Group Number B',
                      'weight': 0.0,
                      'params': [
                        {
                          'name': 'ex-three-name',
                          'value': 'ex-three-b-value'
                        }
                      ]
                    }
                  ]
                },
                'json': true,
                'headers': {
                  'x-api-key': 'abcd'
                }
              },
              function (err, res, body) {
                callback(null);
              });
          },

          function (callback) {
            theHash = 1;

            request.post(
              {
                'url': 'http://localhost:8888/api/participants/',
                'json': true
              },
              function (err, res, body) {
                callback(err);
              });
          },

          function (callback) {
            request.get(
              {
                'url': 'http://localhost:8888/api/participants/1',
                'json': true
              },
              function (err, res, body) {
                expect(res.statusCode).toBe(200);
                expect(body.status).toEqual('success');
                expect(body.decisionsets.length).toEqual(2);
                expect(body.decisionsets[0].experimentId).toEqual(1);
                expect(body.decisionsets[0].experimentName).toEqual('Experiment Number One');
                expect(body.decisionsets[0].variationName).toEqual('Group Number A');
                expect(body.decisionsets[0].variationId).toEqual(1);
                expect(body.decisionsets[0].params['ex-one-name']).toEqual('ex-one-a-value');
                expect(body.decisionsets[1].experimentId).toEqual(2);
                expect(body.decisionsets[1].experimentName).toEqual('Experiment Number Two');
                expect(body.decisionsets[1].variationName).toEqual('Group Number B');
                expect(body.decisionsets[1].variationId).toEqual(4);
                expect(body.decisionsets[1].params['ex-two-name']).toEqual('ex-two-b-value');
                expect(body.trackingidentifiers.length).toEqual(2);
                expect(body.trackingidentifiers[0]).toEqual('freeab_experiment-number-one_group-number-a');
                expect(body.trackingidentifiers[1]).toEqual('freeab_experiment-number-two_group-number-b');
                expect(body.variationidentifiers.length).toEqual(2);
                expect(body.variationidentifiers[0]).toEqual(1);
                expect(body.variationidentifiers[1]).toEqual(4);
                callback(err);
              }
            );
          }

        ],
        function (err, results) {
          done(err);
        }
      );

    });

  });
})();
