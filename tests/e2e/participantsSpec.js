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

describe('The participants API', function() {

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

  it('should return a participantHash when being asked to add a new participant', function(done) {

    theHash = 1;

    request.post(
      {
        'url': 'http://localhost:8888/participants/',
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

});
