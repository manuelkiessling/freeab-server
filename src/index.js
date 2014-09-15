'use strict';

(function() {
  var env = require('./env');
  var dbConnectionPool = require('./dbConnectionPool');
  var backend = require('./backend');
  var crypto = require('crypto');
  var cluster = require('cluster');
  var util = require('util');

  var port;
  if (env === 'staging') {
    port = 8081;
  } else if (env === 'production') {
    port = 8082;
  } else {
    port = 8080;
  }

  var generateHash = function () {
    var rand = Math.random().toString() + Math.random().toString() + Math.random().toString() + Math.random().toString();
    return crypto.createHash('sha256').update(rand).digest('hex');
  };

  var numCPUs = require('os').cpus().length;

  if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
      util.log('worker ' + worker.process.pid + ' died');
    });
  } else {
    var server = backend.init(dbConnectionPool, port, generateHash);
    server.listen(function() {
      console.dir(server.server.router.routes);
      console.log('Listening on port ', port);
    });
  }

})();
