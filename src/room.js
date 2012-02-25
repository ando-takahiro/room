var hat = require('hat'),
    ROOM = 'room:default:room';

function accountKey(id) {
  return 'account:' + id + ':entity';
}

function joinRoom(entity, socket, db) {
  var id = entity.id;

  db.hgetall(ROOM, function(err, members) {
    // TODO: cache?
    // TODO: split request by members size
    socket.emit('welcome', {you: entity, members: members || {}});
  });

  socket.broadcast.emit('newcomer', entity);

  socket.on('disconnect', function() {
    db.hdel(ROOM, id); // remove form room
    db.set(accountKey(id), JSON.stringify(entity)); // save
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
}

function newEntity(socket, db) {
  var id = hat(),
      entity = {
        id: id,
        x: Math.random(),
        y: 0,
        z: Math.random(),
        avatar: 'images/avatar0.png'
      },
      entityStr = JSON.stringify(entity);

  db.hset(ROOM, id, entityStr);
  db.set(accountKey(id), entityStr);
  joinRoom(entity, socket, db);
}

function loadEntity(id, socket, db) {
  db.get(accountKey(id), function(accountStr) {
    if (accountStr) {
      joinRoom(JSON.parse(accountStr), socket, db);
    } else {
      socket.emit('welcome', 'login failed');
    }
  });
}

// Entities was left abandoned in the ROOM when deploy, so recover by this
function recoverEntitiesFromRoom(db) {
  db.hgetall(ROOM, function(kvs) {
    for (var id in kvs) {
      db.set(accountKey(id), kvs[id]);
    }
  });
}

exports.restore = function(sockets, db) {
  recoverEntitiesFromRoom(db);
  db.del(ROOM);

  sockets.on('connection', function(socket) {
    socket.on('login', function(requestedId) {
      if (requestedId === '') {
        // new client
        newEntity(socket, db);
      } else {
        db.hget(ROOM, requestedId, function(err, entityStr) {
          if (entityStr) {
            // another client in same browser
            newEntity(socket, db);
          } else {
            // returned client
            loadEntity(requestedId, socket, db);
          }
        });
      }
    });
  });
};
