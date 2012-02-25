var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    assert = require('assert'),
    hat = require('hat'),
    authom = require('authom'),
    ROOM = 'room:default:room',
    github = authom.createServer({
      service: 'github',
      id: "f09d589b39a9b2960ee6",
      secret: "885131891a0576c859267adc6343f86c918ffca3"
    });

db.on('error', function(e) {
  // [Redis ERROR POLICY]
  // * ignores error generall command process
  // * for a while, treats error only here
  console.error('redis error:', e);
});

db.on('ready', function() {
  // for a while, clean room every boot.
  db.del(ROOM);

  authom.on('auth', function(req, res, data) {
    console.log('authom-auth', req, res, data);
    var answer = Buffer(
      "<html>" +
        "<body>" +
          "<div style='font: 300% sans-serif'>You are " + data.id + " on " + data.service + ".</div>" +
          "<pre><code>" + JSON.stringify(data, null, 2) + "</code></pre>" +
        "</body>" +
      "</html>"
    );
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": answer.length
    });
    res.end(answer);
  });

  authom.on('error', function(req, res, data) {
    console.log('authom-error', req, res, data);
    var answer = Buffer("An error occurred: " + JSON.stringify(data));

    res.writeHead(500, {
      "Content-Type": "text/plain",
      "Content-Length": answer.length
    });

    res.end(answer);
  });

  app.use(express['static']('./public'));
  app.get('/auth/:service', authom.app);

  io.sockets.on('connection', function(socket) {
    var id = hat(),
        entity = {
          id: id, x: Math.random(), y: 0, z: Math.random()
        };

    db.hgetall(ROOM, function(err, members) {
      // TODO: cache?
      // TODO: split request by members size
      socket.emit('everyone', {you: entity, members: members});
    });

    db.hset(ROOM, id, JSON.stringify(entity));

    socket.broadcast.emit('newcomer', entity);

    socket.on('disconnect', function() {
      db.hdel(ROOM, id);
      socket.broadcast.emit('leave', id);
    });

    socket.on('move', function(p) {
      if (typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          typeof p.z === 'number') {

        entity.x = p.x;
        entity.y = p.y;
        entity.z = p.z;

        db.hset(ROOM, id, JSON.stringify(entity));
        socket.broadcast.emit(
          'move',
          {
            id: id,
            position: {x: p.x, y: p.y, z: p.z}
          }
        );
      }
    });
  });

  app.listen(8080);
});
