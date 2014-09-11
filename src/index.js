'use strict';

var DBWrapper = require('node-dbi').DBWrapper;
var dbWrapper = require('./database');
var backend = require('./backend');

var server = backend.init(dbWrapper);

server.listen(function() {
  console.dir(server.server.router.routes);
  console.log('Listening on port ', 8080);
});
