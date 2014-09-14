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

describe('The experiments API', function () {

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

  it('should return an experimentId when creating a new experiment', function (done) {

    var bodyData = {
      'name': 'Checkout page buttons',
      'scope': 50.0,
      'variations': {
        'Group A': {
          'weight': 70.0,
          'params': {
            'foo': 'bar',
          }
        },
        'Group B': {
          'weight': 30.0,
          'params': {
            'foo': 'baz',
          }
        }
      }
    };

    request.post(
      {
        'url': 'http://localhost:8888/experiments/',
        'body': bodyData,
        'json': true
      },
      function (err, res, body) {
        expect(res.statusCode).toBe(200);
        expect(body.status).toEqual('success');
        expect(body.experimentId).toEqual(1);
        done(err);
      }
    );

  });

  it('should not allow to add two experiments with the same name', function (done) {

    var bodyData = {
      'name': 'Checkout page buttons',
      'scope': 100.0,
      'variations': [
        {
          'name': 'Group A',
          'weight': 70.0,
          'params': [
            {
              'name': 'foo',
              'value': 'bar'
            }
          ]
        },
        {
          'name': 'Group B',
          'weight': 30.0,
          'params': [
            {
              'name': 'foo',
              'value': 'baz'
            }
          ]
        }
      ]
    };

    request.post(
      {
        'url': 'http://localhost:8888/experiments/',
        'body': bodyData,
        'json': true
      },
      function (err, res, body) {
        request.post(
          {
            'url': 'http://localhost:8888/experiments/',
            'body': bodyData,
            'json': true
          },
          function (err, res, body) {
            expect(res.statusCode).toBe(400);
            expect(body.error.message).toEqual('Bad Request');
            expect(body.error.detail).toEqual('An experiment with this name already exists');
            done(err);
          });
      });
  });

});
