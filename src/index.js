'use strict';

var DBWrapper = require('node-dbi').DBWrapper;
var backend = require('./backend');

var args = process.argv.slice(2);
var env = args[0];

var dbOptions = require('../database.json');
if (dbOptions[env].driver === 'sqlite3') {
  var dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions[env].filename});
}
dbWrapper.connect();

var server = backend.init(dbWrapper);

server.listen(function() {
  console.dir(server.server.router.routes);
  console.log('Listening on port ', 8080);
});
