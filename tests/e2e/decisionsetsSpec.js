'use strict';

var resetDatabase = require('../resetDatabase');
var dbWrapper = require('../../src/database');
var backend = require('../../src/backend');
var async = require('async');
var request = require('request');

var theHash = 0;

var generateHash = function() {
  return theHash;
};

var server = backend.init(dbWrapper, 8888, generateHash);

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

  it('should return a decisionset for a participant if an experiment exists', function(done) {

    var bodyData = {
      'name': 'Checkout page buttons',
      'scope': 100.0,
      'variations':
        [
          {
            'name': 'Group A',
            'weight': 100.0,
            'params':
              [
                {
                  'name': 'foo',
                  'value': 'bar'
                }
              ]
          },
          {
            'name': 'Group B',
            'weight': 0.0,
            'params':
              [
                {
                  'name': 'foo',
                  'value': 'baz'
                }
              ]
          }
        ]
    };

    async.series(
      [

        function(callback) {
          request.post(
            {
              'url': 'http://localhost:8888/experiments/',
              'body': bodyData,
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
              expect(body.decisionsets.length).toEqual(1);
              expect(body.decisionsets[0].params['foo']).toEqual('bar');
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
