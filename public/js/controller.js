var controller = (function() {
  var exports = {},
      avatars = {},
      MOVE_DURATION = 100,
      USER_ID_KEY = 'userId';

  exports.USER_ID_KEY = USER_ID_KEY;

  //
  // Avatar
  //
  function Avatar(entity, scene) {
    var geometry = new THREE.PlaneGeometry(1, 1),
        material = new THREE.MeshBasicMaterial({
          map: THREE.ImageUtils.loadTexture(entity.avatar),
          depthWrite: false,
          transparent: true
        }),
        mesh = new THREE.Mesh(geometry, material);

    this.tween = new TWEEN.Tween(mesh.position);
    this.entity = _.clone(entity);
    this.mesh = mesh;
    mesh.position.x = entity.x;
    mesh.position.y = entity.y;
    mesh.position.z = entity.z;

    scene.add(mesh);
  }

  Avatar.prototype.move = function(position) {
    this.tween.to(position, MOVE_DURATION).start();
  };

  Avatar.prototype.leave = function(position) {
    this.mesh.parent.remove(this.mesh);
  };

  function createAvatar(entity, scene) {
    var avatar = new Avatar(entity, scene);
    avatars[entity.id] = avatar;
    return avatar;
  }

  //
  // Client
  //
  function Client(socket) {
    this.socket = socket;
  }

  Client.prototype.move = function(position) {
    this.socket.emit('move', {x: position.x, y: position.y, z : position.z});
  };

  //
  // createClient
  //
  exports.createClient = function(socket, storage, scene, gui, onReadyMyAvatar) {
    var userId = storage.getItem(USER_ID_KEY);

    // setup events
    socket.on('welcome', function(message) {
      if (typeof message === 'string') {
        // invalid account. perhaps db was cleared.
        storage.setItem(USER_ID_KEY, '');
        socket.emit('login', '');
        userId = null;
      } else {
        var client = new Client(socket); 

        if (!userId) {
          storage.setItem(USER_ID_KEY, message.you.id);
        }

        var localAvatar = createAvatar(message.you, scene);

        if (onReadyMyAvatar) {
          onReadyMyAvatar(client, localAvatar);
        }

        _(message.members).each(function(entity) {
          createAvatar(JSON.parse(entity), scene);
        });
      }
    });

    socket.on('move', function(message) {
      avatars[message.id].move(message.position);
    });

    gui.on('say', function(msg) {
      gui.emit('hear', msg);
      socket.emit('say', msg);
    });

    socket.on('hear', function(msgs) {
      for (var i = msgs.length - 1; i >= 0; i--) {
        gui.emit('hear', JSON.parse(msgs[i]));
      }
    });

    socket.on('newcomer', function(message) {
      createAvatar(message, scene);
    });

    socket.on('leave', function(id) {
      avatars[id].leave();
      delete avatars[id];
    });

    // do login
    if (userId) {
      socket.emit('login', userId);
    } else {
      socket.emit('login', '');
      userId = null;
    }
  };

  return exports;
})();
