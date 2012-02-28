// based on https://github.com/horaci/node-mitm-proxy
var url = require('url'),
    util = require('util'),
    protocols = {
      'http:': require('http'),
      'https:': require('https')
    };

module.exports = function(target, req, res) {
  var state = {}, parsedUrl = url.parse(target);

  if (parsedUrl.protocol) {
    var reqHeaders = {};
    for (var k in req.headers) {
      reqHeaders[k] = req.headers[k];
    }
    reqHeaders.host = parsedUrl.host;
    var options = {
          host: parsedUrl.host,
          port: parsedUrl.port,
          method: 'GET',
          path: parsedUrl.pathname
        },
        proxyReq = protocols[parsedUrl.protocol].request(options);

    proxyReq.on('response', function(proxyRes) {
      var headers = {};
      for (var k in proxyRes.headers) {
        headers[k] = proxyRes.headers[k];
      }

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

