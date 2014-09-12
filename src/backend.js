'use strict';

var util = require('util');
var Percolator = require('percolator').Percolator;

var init = function(dbWrapper, port, generateHash) {

  var server = Percolator({'port': port});

  server.route(
    '/experiments',

    {
      POST: function(req, res) {

        req.onJson(function(err, obj) {
          if (err) {
            util.error(err);
            return res.status.internalServerError();
          }

          var data = { 'name': obj.name, 'scope': obj.scope };

          dbWrapper.fetchRow('SELECT COUNT(*) AS cnt FROM experiment WHERE name = ?', [data.name], function(err, result) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }

            if (result['cnt'] > 0) {
              return res.status.badRequest('An experiment with this name already exists');
            } else {
              dbWrapper.insert('experiment', data, function(err) {
                if (err) {
                  util.error(err);
                  return res.status.internalServerError();
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

  server.route(
    '/participants',

    {
      POST: function (req, res) {

          var hash = generateHash();

          var data = { 'hash': hash };

          dbWrapper.insert('participant', data, function (err) {
            if (err) {
              util.error(err);
              return res.status.internalServerError();
            }
            var body = {
              'status': 'success',
              'participantHash': hash
            };
            res.object(body).send();

          });

      }
    }

  );

  return server;
};

module.exports = { 'init': init };
