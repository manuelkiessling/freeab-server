'use strict';

var env = process.env.FREEAB_ENV || 'test';

var dbWrapper = require('../../src/database');
var backend = require('../../src/backend');
var async = require('async');
var request = require('request');

var server = backend.init(dbWrapper, 8888);

describe('The experiments API', function() {

  beforeEach(function(done) {

    async.series([
      function(callback) {
        dbWrapper.remove('experiment', '1', function(err) {
          callback(err, null);
        });
      },
      function(callback) {
        dbWrapper.remove('sqlite_sequence', '1', function(err) {
          callback(err, null);
        });
      }
    ], function(err, results) {
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

  it('should return an experimentId when creating a new experiment', function(done) {

    var body = {
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
        'body': body,
        'json': true
      },
      function (err, res, body) {
        done(err);
        expect(res.statusCode).toBe(200);
        expect(body.status).toEqual('success');
        expect(body.experimentId).toEqual(1);
      }
    );

  });

});
