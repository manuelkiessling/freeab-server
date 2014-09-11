'use strict';

var backend = require('./backend');

var server = backend.init('dev');

server.listen(function() {
  console.log(server.server.router.routes);
  console.log('Listening on port ', 8080);
});
