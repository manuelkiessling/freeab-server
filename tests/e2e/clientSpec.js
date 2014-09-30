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

  describe('The client', function () {

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

    it('should return success and empty values if no user hash is given', function (done) {

      request.get(
        {
          'url': 'http://localhost:8888/client.js?cookieDomain=localhost',
          'json': false,
        },
        function (err, res, body) {
          expect(res.statusCode).toBe(200);
          expect(body.indexOf('"status": "success"')).toNotBe(-1);
          expect(body.indexOf('"error": {')).toBe(-1);
          expect(body.indexOf('"decisionsets": [],')).toNotBe(-1);
          expect(body.indexOf('"trackingidentifiers": [],')).toNotBe(-1);
          expect(body.indexOf('"variationidentifiers": []')).toNotBe(-1);
          done(err);
        }
      );

    });

    it('should return an error and empty values if user hash is not known', function (done) {

      var jar = request.jar();
      var cookie = request.cookie('freeab_participantHash=1234567890987654321');
      jar.setCookieSync(cookie, 'http://localhost:8888');

      request.get(
        {
          'url': 'http://localhost:8888/client.js?cookieDomain=localhost',
          'jar': jar,
          'json': false,
        },
        function (err, res, body) {
          expect(res.statusCode).toBe(200);
          expect(body.indexOf('"status": "success"')).toBe(-1);
          expect(body.indexOf('"detail": "Error: Could not find participant with hash 1234567890987654321 in database."')).toNotBe(-1);
          expect(body.indexOf('"error": {')).toNotBe(-1);
          expect(body.indexOf('"decisionsets": [],')).toNotBe(-1);
          expect(body.indexOf('"trackingidentifiers": [],')).toNotBe(-1);
          expect(body.indexOf('"variationidentifiers": []')).toNotBe(-1);
          done(err);
        }
      );

    });

  });
})();
