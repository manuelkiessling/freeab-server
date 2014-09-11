'use strict';

var Percolator = require('percolator').Percolator;
var DBWrapper = require('node-dbi').DBWrapper;

var init = function(env) {
  var dbOptions = require('../database.json');
  if (dbOptions[env].driver === 'sqlite3') {
    var dbWrapper = new DBWrapper('sqlite3', {'path': dbOptions[env].filename});
  }
  dbWrapper.connect();

  var server = Percolator({port: 8080});

  server.route(
    '/experiments',

    {
      POST: function(req, res) {
        req.onJson(function(err, obj) {

          var data = {'name': obj.name, 'scope': obj.scope};
          dbWrapper.insert('experiment', data, function(err) {
            var body = {
              'status': 'success',
              'experimentId': dbWrapper.getLastInsertId()
            };

            res.object(body).send();
          });

        });
      }
    }
  );
  return server;
};

module.exports = { 'init': init };
