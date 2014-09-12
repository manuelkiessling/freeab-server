'use strict';

var resetDatabase = require('../resetDatabase');
var dbWrapper = require('../../src/database');
var backend = require('../../src/backend');
var async = require('async');
var request = require('request');
var crypto = require('crypto');

var server = backend.init(dbWrapper, 8888);

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

  it('should return a participantId when being asked to add a new participant', function(done) {

    var participantId = crypto.createHash('sha256').update('hduedzg873Zgdug7634gu' + '1' + 'I88dhi4gFftdez34764367dgzu').digest('hex');

    request.post(
      {
        'url': 'http://localhost:8888/participants/',
        'body': null,
        'json': true
      },
      function (err, res, body) {
        expect(res.statusCode).toBe(200);
        expect(body.status).toEqual('success');
        expect(body.participantId).toEqual(participantId);
        done(err);
      }
    );

  });

});
