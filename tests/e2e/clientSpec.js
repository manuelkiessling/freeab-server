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

    it('should return success and empty values if no participant hash is given and there are no experiments', function (done) {

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

    it('should return success and sensible values if no participant hash is given and there are experiments', function (done) {

      var bodyData = {
        'name': 'Checkout page buttons',
        'scope': 100.0,
        'variations': [
          {
            'name': 'Group A',
            'weight': 100.0,
            'params': [
              {
                'name': 'foo',
                'value': 'bar'
              }
            ]
          },
          {
            'name': 'Group B',
            'weight': 0.0,
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
          'url': 'http://localhost:8888/api/experiments/',
          'body': bodyData,
          'json': true,
          'headers': {
            'x-api-key': 'abcd'
          }
        },
        function (err, res, body) {

          request.get(
            {
              'url': 'http://localhost:8888/client.js?cookieDomain=localhost',
              'json': false,
            },
            function (err, res, body) {
              console.log(body);
              expect(res.statusCode).toBe(200);
              expect(body.indexOf('"status": "success"')).toNotBe(-1);
              expect(body.indexOf('"error": {')).toBe(-1);

              expect(body.indexOf('"decisionsets": [')).toNotBe(-1);
              expect(body.indexOf('"experimentName": "Checkout page buttons",')).toNotBe(-1);
              expect(body.indexOf('"experimentId": 1,')).toNotBe(-1);
              expect(body.indexOf('"variationName": "Group A",')).toNotBe(-1);
              expect(body.indexOf('"variationId": 1,')).toNotBe(-1);
              expect(body.indexOf('"params": {')).toNotBe(-1);
              expect(body.indexOf('"foo": "bar"')).toNotBe(-1);

              expect(body.indexOf('Group B')).toBe(-1);

              expect(body.indexOf('  "trackingidentifiers": [\n    "freeab_checkout-page-buttons_group-a"\n  ],\n')).toNotBe(-1);

              expect(body.indexOf('  "variationidentifiers": [\n    1\n  ]\n')).toNotBe(-1);

              done(err);
            }
          );

        });

    });

    it('should return an error and empty values if given participant hash is not known', function (done) {

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

    it('should return an error and empty values if given participant hash is not known, even if experiments exist', function (done) {

      var bodyData = {
        'name': 'Checkout page buttons',
        'scope': 100.0,
        'variations': [
          {
            'name': 'Group A',
            'weight': 100.0,
            'params': [
              {
                'name': 'foo',
                'value': 'bar'
              }
            ]
          },
          {
            'name': 'Group B',
            'weight': 0.0,
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
          'url': 'http://localhost:8888/api/experiments/',
          'body': bodyData,
          'json': true,
          'headers': {
            'x-api-key': 'abcd'
          }
        },
        function (err, res, body) {
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
        }
      );

    });

  });
})();
