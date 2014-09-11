'use strict';

var env = require('./env');
var dbWrapper = require('./database');
var backend = require('./backend');

var port;
if (env === 'staging') {
  port = 8081;
} else if (env === 'production') {
  port = 8082;
} else {
  port = 8080;
}

var server = backend.init(dbWrapper, port);

server.listen(function() {
  console.dir(server.server.router.routes);
  console.log('Listening on port ', port);
});
