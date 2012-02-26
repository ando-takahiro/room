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
  db.hsetnx(MEMBERS, id, JSON.stringify(entity), function(err, isSet) {
    if (isSet === 1) {
      function save() {
        db.hset(MEMBERS, id, JSON.stringify(entity));
      }

      //
      // event handlers
      //
      socket.on('disconnect', function() {
        db.hdel(MEMBERS, id); // remove form room
        db.set(accountKey(id), JSON.stringify(entity)); // save
        socket.broadcast.emit('leave', id);
      });

      socket.on('say', function(message) {
        var record = {
              user: id,
              date: +new Date(),
              message: message
            },
            recordStr = JSON.stringify(record);

        db.lpush(CHAT, recordStr);
        db.ltrim(CHAT, 0, CHAT_MAX_LOG - 1);
        socket.broadcast.emit('hear', [recordStr]);
      });

      socket.on('move', function(p) {
        if (typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          typeof p.z === 'number') {

          entity.x = p.x;
          entity.y = p.y;
          entity.z = p.z;

          save();
          socket.broadcast.emit(
            'move',
            {
              user: id,
              position: {x: p.x, y: p.y, z: p.z}
            }
          );
        }
      });

      socket.on('changeAvatar', function(avatar) {
        if (avatar.length > 100) {
          avatar.length = 100;
        }
        entity.avatar = avatar;
        entity.isInitialAvatar = false;
        save();
        socket.broadcast.emit('changeAvatar', {
          user: id, avatar: avatar
        });
      });

      socket.on('changeName', function(newName) {
        if (newName.length > 10) {
          newName.length = 10;
        }
        entity.name = newName;
        entity.isInitialName = false;
        save();
        socket.broadcast.emit('changeName', {
          user: id, name: newName
        });
      });

      //
      // initial events pushing
      //
      db.lrange(CHAT, 0, -1, function(err, msgs) {
        if (msgs.length > 0) {
          socket.emit('hear', msgs);
        }
      });

      db.hgetall(MEMBERS, function(err, members) {
        // TODO: cache?
        // TODO: split request by members size
        socket.emit('welcome', {you: entity, members: members || {}});
      });

      socket.broadcast.emit('newcomer', entity);
    } else {
      // fail -> so new entity
      newEntity(socket, db);
    }
  });
}

function newEntity(socket, db) {
  var id = hat() + +(new Date()),
      entity = {
        id: id,
        x: Math.random(),
        y: 0,
        z: Math.random(),
        avatar: 'images/avatar0.png',
        name: 'noname' + (+new Date()) % 1000,
        isInitialName: true,
        isInitialAvatar: true
      },
      entityStr = JSON.stringify(entity);

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
        // new account
        newEntity(socket, db);
      } else {
        // existing account
        loadEntity(requestedId, socket, db);
      }
    });
  });
};
