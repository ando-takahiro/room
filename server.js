var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    db = require('redis').createClient(),
    url = require('url'),
    room = require('./src/room'),
    proxy = require('./src/proxy');

db.on('ready', function() {
  app.get('/image-proxy', function(req, res) { // proxy for webgl
    proxy(url.parse(req.url).query, req, res);
  });
  app.use(express['static']('./public'));
  room.restore(io.sockets, db);
  server.listen(8080);
});

db.on('error', function(e) {
  // [Redis ERROR POLICY]
  // * ignores error in generall command processing
  // * for a while, treats error only here
  console.error('redis error:', e);
});
