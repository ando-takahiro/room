var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    redis = require('redis'),
    db,
    assert = require('assert'),
    hat = require('hat'),
    MEMBERS = 'room:default:members';

if (process.env.ROOM_CONF) {
  db = redis.createClient();
} else {
  var dotCloudEnv = JSON.parse(
    fs.readFileSync('/home/dotcloud/environment.json')
  );

  db = redis.createClient(
    dotCloudEnv.DOTCLOUD_DATA_REDIS_PORT,
    dotCloudEnv.DOTCLOUD_DATA_REDIS_HOST
  );
  db.auth(dotCloudEnv.DOTCLOUD_DATA_REDIS_PASSWORD);
}


db.on('error', function(e) {
  // [Redis ERROR POLICY]
  // * コマンド応答時のエラーは無視
  // * 当面はこのコールバックのみでログを吐き出す
  console.error('redis error:', e);
});

db.on('ready', function() {
  app.use(express['static']('./public'));

  io.sockets.on('connection', function(socket) {
    var id = hat(),
        entity = {
          id: id, x: Math.random(), y: 0, z: Math.random()
        };

    db.hgetall(MEMBERS, function(err, members) {
      // TODO: cache?
      // TODO: split request by members size
      socket.emit('everyone', {you: entity, members: members});
    });

    db.hset(MEMBERS, id, JSON.stringify(entity));

    socket.broadcast.emit('newcomer', entity);

    socket.on('disconnect', function() {
      db.hdel(MEMBERS, id);
      socket.broadcast.emit('leave', id);
    });

    socket.on('move', function(p) {
      if (typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          typeof p.z === 'number') {

        entity.x = p.x;
        entity.y = p.y;
        entity.z = p.z;

        db.hset(MEMBERS, id, JSON.stringify(entity));
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
