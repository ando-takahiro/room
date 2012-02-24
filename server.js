var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    redis = require('redis'),
    db = redis.createClient(),
    assert = require('assert'),
    hat = require('hat'),
    authom = require('authom'),
    ROOM = 'room:default:room',
    github = authom.createServer({
      service: 'github',
      id: "38226d79050594da688e",
      secret: "f90e848d53ddc2f5c3233a4623a08a3b84466841"
    });

db.on('error', function(e) {
  // [Redis ERROR POLICY]
  // * コマンド応答時のエラーは無視
  // * 当面はこのコールバックのみでログを吐き出す
  console.error('redis error:', e);
});

db.on('ready', function() {
  //TODO: 当面起動毎に部屋をクリア
  db.del(ROOM);

  authom.on('auth', function(req, res, data) {
    console.log('authom-auth', req, res, data);
  });

  authom.on('error', function(req, res, data) {
    console.log('authom-error', req, res, data);
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
