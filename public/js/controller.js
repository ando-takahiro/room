var controller = (function() {
  var exports = {},
      avatars = {},
      MOVE_DURATION = 500,
      USER_ID_KEY = 'userId',
      INITIAL_XZ_RADIUS = 3,
      INITIAL_Y = 8,
      INITIAL_BOUND_MAX_DELAY = 1000,
      INITIAL_BOUND_DURATION = 2000;

  exports.USER_ID_KEY = USER_ID_KEY;

  //
  // Avatar
  //
  function Avatar(entity, scene) {
    var geometry = new THREE.PlaneGeometry(1, 1),
        avatarURL = '/image-proxy?' + entity.avatar,
        material = new THREE.MeshBasicMaterial({
          map: THREE.ImageUtils.loadTexture(avatarURL),
          depthWrite: false,
          transparent: true
        }),
        mesh = new THREE.Mesh(geometry, material);

    this.entity = _.clone(entity);
    this.mesh = mesh;
    var theta = (2 * Math.random() - 1) * Math.PI;
    mesh.position.x = entity.x + INITIAL_XZ_RADIUS * Math.cos(theta);
    mesh.position.y = entity.y + INITIAL_Y;
    mesh.position.z = entity.z + INITIAL_XZ_RADIUS * Math.sin(theta);
    mesh.rotation.y = 3 * Math.PI * Math.random();
    mesh.doubleSided = true;

    setTimeout(function() {
      (new TWEEN.Tween(mesh.position)).to({y: entity.y}, INITIAL_BOUND_DURATION).easing(TWEEN.Easing.Bounce.EaseOut).start();
      (new TWEEN.Tween(mesh.position)).to({x: entity.x, z: entity.z}, INITIAL_BOUND_DURATION).easing(TWEEN.Easing.Quadratic.EaseInOut).start();
      (new TWEEN.Tween(mesh.rotation)).to({y: 0}, INITIAL_BOUND_DURATION).easing(TWEEN.Easing.Back.EaseOut).start();

      scene.add(mesh);
    }, INITIAL_BOUND_MAX_DELAY * Math.random());
  }

  Avatar.prototype.move = function(position) {
    (new TWEEN.Tween(this.mesh.position)).to(position, MOVE_DURATION).easing(TWEEN.Easing.Quadratic.EaseInOut).start();
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
  // login
  //
  exports.login = function(socket, storage, scene, gui, onReadyMyAvatar) {
    var userId = storage.getItem(USER_ID_KEY);

    // setup events
    socket.on('welcome', function(message) {
      if (typeof message === 'string') {
        // invalid account. perhaps db was cleared.
        storage.setItem(USER_ID_KEY, '');
        socket.emit('login', '');
        userId = null;
      } else {
        if (!userId) {
          storage.setItem(USER_ID_KEY, message.you.id);
        }

        var localAvatar = createAvatar(message.you, scene),
            id = message.you.id;

        gui.on('changeName', function(name) {
          localAvatar.entity.name = name;
          socket.emit('changeName', name);
        });

        gui.on('changeAvatar', function(avatar) {
          localAvatar.entity.avatar = avatar;
          localAvatar.mesh.material.map.image.src = '/image-proxy?' + avatar;
          socket.emit('changeAvatar', avatar);
        });

        gui.on('move', function(position) {
          socket.emit('move', {x: position.x, y: position.y, z : position.z});
        });

        gui.on('say', function(msg) {
          gui.emit('hear', {user: id, message: msg, date: +new Date()});
          socket.emit('say', msg);
        });

        _(message.members).each(function(entity, entityId) {
          if (entityId !== id) {
            createAvatar(JSON.parse(entity), scene);
          }
        });

        if (onReadyMyAvatar) {
          onReadyMyAvatar(localAvatar, avatars);
        }

        socket.on('move', function(message) {
          var avatar = avatars[message.user];
          if (avatar !== undefined) {
            avatar.move(message.position);
          }
        });

        socket.on('newcomer', function(message) {
          if (message.id !== id) {
            createAvatar(message, scene);
          }
        });

        socket.on('leave', function(id) {
          var avatar = avatars[id];
          if (avatar) {
            avatar.leave();
            delete avatars[id];
          }
        });

        socket.on('updateName', function(message) {
          var avatar = avatars[message.user];
          if (avatar) {
            avatar.entity.name = message.name;
            gui.emit('updateName', message.user);
          }
        });

        socket.on('updateAvatar', function(message) {
          var avatar = avatars[message.user];
          if (avatar) {
            avatar.entity.avatar = message.avatar;
            avatar.mesh.material.map.image.src = '/image-proxy?' + message.avatar;
          }
        });
      }
    });

    socket.on('hear', function(msgs) {
      for (var i = msgs.length - 1; i >= 0; i--) {
        gui.emit('hear', JSON.parse(msgs[i]));
      }
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
