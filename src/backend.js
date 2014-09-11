'use strict';

var Percolator = require('percolator').Percolator;

var init = function(dbWrapper) {

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
