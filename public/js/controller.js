var controller = (function() {
  var exports = {},
      avatars = {},
      MOVE_DURATION = 100;

  function Avatar(entity, scene) {
    var geometry = new THREE.PlaneGeometry(1, 1),
        material = new THREE.MeshBasicMaterial({
          map: THREE.ImageUtils.loadTexture('images/avatar0.png'),
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

  function Client(socket) {
    this.socket = socket;
  }

  Client.prototype.move = function(position) {
    this.socket.emit('move', {x: position.x, y: position.y, z : position.z});
  };

  exports.createClient = function(scene, onReadyMyAvatar) {
    var socket = io.connect(),
        id = 'unknwon',
        client = new Client(socket);

    socket.on('connect', function() {

      socket.on('everyone', function(message) {
        var localAvatar = createAvatar(message.you, scene);

        if (onReadyMyAvatar) {
          onReadyMyAvatar(client, localAvatar);
        }

        _(message.members).each(function(entity) {
          createAvatar(JSON.parse(entity), scene);
        });
      });

      socket.on('move', function(message) {
        avatars[message.id].move(message.position);
      });

      socket.on('newcomer', function(message) {
        createAvatar(message, scene);
      });

      socket.on('leave', function(id) {
        avatars[id].leave();
        delete avatars[id];
      });
    });
  };

  return exports;
})();
