'use strict';

var raven  = require('raven');

exports.register = function (server, options, next) {
  var client = new raven.Client(options.dsn, options.client);
  server.expose('client', client);
  server.on({
    name: 'request-internal',
    filter: {
      all: true,
      tags: [ 'internal', 'implementation', 'error' ]
    }
  }, function (request, event) {
    const err = event.data;
    const meta = {
      tags: options.events
    };

    if (!request) {
      meta.extra = {
        timestamp: event.timestamp,
        logTags: event.tags
      }
      client.captureException(err, meta);
    } else {
      var baseUrl = request.info.uri;
      if (baseUrl === undefined) {
        if (request.info.host) baseUrl = server.info.protocol + '://' + request.info.host;
        else baseUrl = server.info.uri;
      }
      (client.captureException || client.captureError).call(client, err, {
        request: {
          method: request.method,
          url: baseUrl + request.path,
          query_string: request.query,
          headers: request.headers,
          cookies: request.state,
        },
        extra: {
          timestamp: request.info.received,
          id: request.id,
          remoteAddress: request.info.remoteAddress,
          logTags: event.tags
        },
        tags: options.tags
      });
    }
  });

  next();
};

exports.register.attributes = {
  pkg: require('../package')
};
