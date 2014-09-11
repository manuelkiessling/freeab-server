'use strict';

var Percolator = require('percolator').Percolator;

var init = function(dbWrapper, port) {

  var server = Percolator({'port': port});

  server.route(
    '/experiments',

    {
      POST: function(req, res) {
        req.onJson(function(err, obj) {

          var data = {'name': obj.name, 'scope': obj.scope};

          dbWrapper.fetchRow('SELECT COUNT(*) AS cnt FROM experiment WHERE name = ?', [data.name], function(err, result) {
            if (err) {
              return res.status.internalServerError(err);
            }

            if (result['cnt'] > 0) {
              return res.status.badRequest('An experiment with this name already exists');
            } else {
              dbWrapper.insert('experiment', data, function(err) {
                if (err) {
                  return res.status.internalServerError(err);
                }
                var body = {
                  'status': 'success',
                  'experimentId': dbWrapper.getLastInsertId()
                };
                res.object(body).send();
              });
            }

          });

        });
      }
    }
  );
  return server;
};

module.exports = { 'init': init };
