'use strict';

var dbConnectionPool = require('../../src/dbConnectionPool');
var resetDatabase = require('../resetDatabase');
var backend = require('../../src/backend');
var async = require('async');
var request = require('request');

var theHash = 0;
var generateHash = function() {
  return theHash;
};

var server = backend.init(dbConnectionPool, 8888, generateHash);

describe('The decisionsets API', function() {

  beforeEach(function(done) {
    resetDatabase(function() {
      server.listen(function(err) {
        done(err);
      });
    });
  });

  afterEach(function(done) {
    server.close(function() {
      done();
    });
  });

  it('should return no data for a participant if no experiments exist', function(done) {

    theHash = 1;

    request.post(
      {
        'url': 'http://localhost:8888/participants/',
        'json': true
      },
      function (err, res, body) {

        request.get(
          {
            'url': 'http://localhost:8888/participants/1/decisionsets/',
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

  it('should return decisionset for a participant if experiments exists', function(done) {

    var bodyData = 1;

    async.series(
      [

        function(callback) {
          request.post(
            {
              'url': 'http://localhost:8888/experiments/',
              'body': {
                'name': 'Experiment One',
                'scope': 100.0,
                'variations':
                  [
                    {
                      'name': 'Group A',
                      'weight': 100.0,
                      'params':
                        [
                          {
                            'name': 'ex-one-name',
                            'value': 'ex-one-a-value'
                          }
                        ]
                    },
                    {
                      'name': 'Group B',
                      'weight': 0.0,
                      'params':
                        [
                          {
                            'name': 'ex-one-name',
                            'value': 'ex-one-b-value'
                          }
                        ]
                    }
                  ]
              },
              'json': true
            },
            function (err, res, body) {
              callback(err);
            });
        },

        function(callback) {
          request.post(
            {
              'url': 'http://localhost:8888/experiments/',
              'body': {
                'name': 'Experiment Two',
                'scope': 100.0,
                'variations':
                  [
                    {
                      'name': 'Group A',
                      'weight': 0.0,
                      'params':
                        [
                          {
                            'name': 'ex-two-name',
                            'value': 'ex-two-a-value'
                          }
                        ]
                    },
                    {
                      'name': 'Group B',
                      'weight': 100.0,
                      'params':
                        [
                          {
                            'name': 'ex-two-name',
                            'value': 'ex-two-b-value'
                          }
                        ]
                    }
                  ]
              },
              'json': true
            },
            function (err, res, body) {
              callback(err);
            });
        },

        function(callback) {
          theHash = 1;

          request.post(
            {
              'url': 'http://localhost:8888/participants/',
              'json': true
            },
            function (err, res, body) {
              callback(err);
            });
        },

        function(callback) {
          request.get(
            {
              'url': 'http://localhost:8888/participants/1/decisionsets/',
              'json': true
            },
            function (err, res, body) {
              expect(res.statusCode).toBe(200);
              expect(body.status).toEqual('success');
              expect(body.decisionsets.length).toEqual(2);
              expect(body.decisionsets[0].params['ex-one-name']).toEqual('ex-one-a-value');
              expect(body.decisionsets[1].params['ex-two-name']).toEqual('ex-two-b-value');
              callback(err);
            }
          );
        }

      ],
      function(err, results) {
        done(err);
      }
    );

  });

});
