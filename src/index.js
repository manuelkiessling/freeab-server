'use strict';

var http = require('http');
var url = require('url');
var querystring = require('querystring');

http.createServer(function(request, response) {

  var result = {
    "status": 'success',
    'experimentId': '123456',
  };

  response.writeHead(200, {"Content-Type": "application/json"});
  response.end(JSON.stringify(result));

}).listen(
  8080,
  function() {
    console.log('freeab Server listening on port 8080');
  }
);
