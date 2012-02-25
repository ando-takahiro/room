var app = require('express').createServer(),
    io = require('socket.io').listen(app),
    redis = require('./src/redis'),
    room = require('./src/room');

redis.setup(function(db) {
  app.use(express['static']('./public'));
  room.restore(io.sockets, db);
  app.listen(8080);
});
