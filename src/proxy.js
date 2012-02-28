var url = require('url'),
    util = require('util'),
    protocols = {
      'http:': require('http'),
      'https:': require('https')
    };

module.exports = function(target, req, res) {
  var state = {}, requestOpts = url.parse(target);

  if (requestOpts.protocol) {
    var proxyReq = protocols[requestOpts.protocol].request(requestOpts);

    proxyReq.on('response', function(proxyRes) {
      var headers = {};
      for (var k in proxyReq.headers) {
        headers[k] = proxyReq.headers[k];
      }
      delete headers.via;
      delete headers['x-cache'];
      delete headers['x-cache-lookup'];

      //Pump the response of the server to the client
      res.writeHead(proxyRes.statusCode, headers);
      util.pump(proxyRes, res);
    });

    proxyReq.on('error', function(err) {
      res.writeHeader(503);
      res.end();
    });

    proxyReq.on('data', function(d) {
      req.write(d, 'binary');
    });

    proxyReq.on('end', function() {
      req.end();
    });

    proxyReq.on('close', function() {
      req.connection.end();
    });

    proxyReq.on('error', function(exception) { 
      res.end(); 
    });

    //Pump data from the client to the server
    util.pump(req, proxyReq);
  } else {
    // local file
    res.writeHead(301, {Location: target});
    res.end();
  }
};

