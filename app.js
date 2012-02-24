var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    redis = require('redis').createClient(),
    assert = require('assert'),
    hat = require('hat'),
    MEMBERS = 'room:default:members';

redis.on('error', function(e) {
  // [Redis ERROR POLICY]
  // * コマンド応答時のエラーは無視
  // * 当面はこのコールバックのみでログを吐き出す
  console.error('redis error:', e);
});

redis.on('ready', function() {
  app.use(express['static']('./public'));

  process.on('SIGINT', function() {
    console.log('sigint');
    redis.shutdown();
    process.exit(1);
  });

  io.sockets.on('connection', function(socket) {
    var id = hat(),
        entity = {
          id: id, x: Math.random(), y: 0, z: Math.random()
        };

    redis.hgetall(MEMBERS, function(err, members) {
      // TODO: cache?
      // TODO: split request by members size
      socket.emit('everyone', {you: entity, members: members});
    });

    redis.hset(MEMBERS, id, JSON.stringify(entity));

    socket.broadcast.emit('newcomer', entity);

    socket.on('disconnect', function() {
      redis.hdel(id, function() {
        socket.broadcast.emit('leave', id);
      });
    });

    socket.on('move', function(p) {
      if (typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          typeof p.z === 'number') {

        entity.x = p.x;
        entity.y = p.y;
        entity.z = p.z;

        redis.hset(MEMBERS, id, JSON.stringify(entity));
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

  app.listen(8000);
});
