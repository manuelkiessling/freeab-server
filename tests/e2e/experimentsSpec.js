'use strict';

require('../../src/index.js');
var request = require('request');

describe('Creating an experiment', function() {

  it('should return an experimentId', function(done) {

    request.post(
      {
        'url': 'http://localhost:8080/api/experiments/',
        'body': '',
        'json': true
      },
      function (err, res, body) {
        done(err);
        expect(body).toEqual({"status":"success","experimentId":"123456"});
      }
    );

  });

});
