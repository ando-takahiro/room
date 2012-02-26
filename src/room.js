var hat = require('hat'),
    MEMBERS = 'room:default:members',
    CHAT = 'room:default:chat',
    CHAT_MAX_LOG = 100;

exports.MEMBERS_KEY = MEMBERS;
exports.CHAT_KEY = CHAT;

function accountKey(id) {
  return 'account:' + id + ':entity';
}

function joinRoom(entity, socket, db) {
  var id = entity.id;

  socket.on('disconnect', function() {
    db.hdel(MEMBERS, id); // remove form room
    db.set(accountKey(id), JSON.stringify(entity)); // save
    socket.broadcast.emit('leave', id);
  });

  socket.on('say', function(message) {
    var record = {
          talker: id,
          date: +new Date(),
          message: message
        },
        recordStr = JSON.stringify(record);

    db.lpush(CHAT, recordStr);
    db.ltrim(CHAT, 0, CHAT_MAX_LOG - 1);
    socket.broadcast.emit('hear', recordStr);
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

  db.hgetall(MEMBERS, function(err, members) {
    // TODO: cache?
    // TODO: split request by members size
    socket.emit('welcome', {you: entity, members: members || {}});
  });

  socket.broadcast.emit('newcomer', entity);

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

  db.hset(MEMBERS, id, entityStr);
  db.set(accountKey(id), entityStr);
  joinRoom(entity, socket, db);
}

function loadEntity(id, socket, db) {
  db.get(accountKey(id), function(err, accountStr) {
    if (accountStr) {
      joinRoom(JSON.parse(accountStr), socket, db);
    } else {
      socket.emit('welcome', 'login failed');
    }
  });
}

// Avatars are left abandoned in the MEMBERS after deploy, so recover by this function
function recoverEntitiesFromRoom(db) {
  db.hgetall(MEMBERS, function(err, kvs) {
    for (var id in kvs) {
      db.set(accountKey(id), kvs[id]);
    }
  });
}

exports.restore = function(sockets, db) {
  recoverEntitiesFromRoom(db);
  db.del(MEMBERS);

  sockets.on('connection', function(socket) {
    socket.on('login', function(requestedId) {
      if (requestedId === '') {
        // new client
        newEntity(socket, db);
      } else {
        db.hget(MEMBERS, requestedId, function(err, entityStr) {
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
