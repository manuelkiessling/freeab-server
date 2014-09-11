'use strict';

var backend = require('../../src/backend');
var request = require('request');
var DBWrapper = require('node-dbi').DBWrapper;

var dbOptions = require('../../database.json');
var dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions.test.filename});
dbWrapper.connect();

var server = backend.init('test');

describe('The experiments API', function() {

  beforeEach(function(done) {
    dbWrapper.remove('experiment', '1', function(err) {
      dbWrapper.remove('sqlite_sequence', '1', function(err) { // Reset SQLite primary key counter for all tables
        server.listen(function () {
          done(err);
        });
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
        'url': 'http://localhost:8080/experiments/',
        'body': body,
        'json': true
      },
      function (err, res, body) {
        done(err);
        expect(body.status).toEqual('success');
        expect(body.experimentId).toEqual(1);
      }
    );

  });

});
