'use strict';

var env = require('./env');
var dbWrapper = require('./database');
var backend = require('./backend');
var crypto = require('crypto');

var port;
if (env === 'staging') {
  port = 8081;
} else if (env === 'production') {
  port = 8082;
} else {
  port = 8080;
}

var generateHash = function() {
  var rand = Math.random().toString() + Math.random().toString() + Math.random().toString(); + Math.random().toString();
  return crypto.createHash('sha256').update(rand).digest('hex');
};

var server = backend.init(dbWrapper, port, generateHash);

server.listen(function() {
  console.dir(server.server.router.routes);
  console.log('Listening on port ', port);
});
