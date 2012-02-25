var expect = require('expect.js'),
    browser = require('./browser'),
    sinon = require('sinon'),
    util = require('util'),
    room = require('../src/room'),
    EventEmitter = require('events').EventEmitter;

browser.load('public/vendor/Tween.js');
browser.load('public/js/controller.js');

//
// socket.io mock
//
function MockSocket(local, remote) {
  this.local = local;
  this.remote = remote;
  this.broadcast = new EventEmitter();
}

MockSocket.prototype.emit = function() {
  return this.remote.emit.apply(this.remote, arguments);
};

MockSocket.prototype.on = function() {
  return this.local.on.apply(this.local, arguments);
};

MockSocket.makePair = function() {
  var serverEmitter = new EventEmitter(),
      clientEmitter = new EventEmitter();

  return {
    server: new MockSocket(serverEmitter, clientEmitter),
    client: new MockSocket(clientEmitter, serverEmitter)
  };
}

//
// local storage mock
//
// based on https://github.com/coolaj86/node-localStorage/blob/master/lib/localStorage.js

function Storage() {}

Storage.prototype.getItem = function (key) {
  return (key in this) ? this[key] : null;
};

Storage.prototype.setItem = function (key, val) {
  this[key] = String(val);
};

Storage.prototype.removeItem = function (key) {
  delete this[key];
};

Storage.prototype.clear = function () {
  var self = this;
  Object.keys(self).forEach(function (key) {
    self[key] = undefined;
    delete self[key];
  });
};

Storage.prototype.key = function (i) {
  i = i || 0;
  return Object.keys(this)[i];
};

Storage.prototype.__defineGetter__('length', function () {
  return Object.keys(this).length;
});

//
// tests
//
describe('controller.createClient', function() {
  var sock, storage;

  beforeEach(function() {
    sock = MockSocket.makePair();
    storage = new Storage();
    sinon.stub(THREE.ImageUtils, 'loadTexture', function() {
      return null;
    });
  });

  afterEach(function() {
    THREE.ImageUtils.loadTexture.restore();
  });

  it('uses "" at first time login', function(done) {
    // dummy server
    sock.server.on('login', function(userId) {
      expect(userId).to.be('');
      sock.server.emit('welcome', {
        you: {
          id: '1234',
          x: 0.1,
          y: 0,
          z: 0.2
        }
      });
    });

    expect(storage.getItem(controller.USER_ID_KEY)).to.be(null);

    controller.createClient(
      sock.client,
      storage,
      new THREE.Scene(),
      function(client, localAvatar) {
        expect(client).not.to.be(null);
        expect(storage.getItem('userId')).to.be(localAvatar.entity.id);
        var mesh = localAvatar.mesh;
        expect(mesh.position.x).to.be(0.1);
        expect(mesh.position.y).to.be(0);
        expect(mesh.position.z).to.be(0.2);
        done();
      }
    );

    sock.server.emit('connect');
  });

  it('uses stored id at second time login', function(done) {
    // dummy server
    sock.server.on('login', function(userId) {
      expect(userId).to.be('helloworld');
      sock.server.emit('welcome', {
        you: {
          id: userId,
          x: 0.1,
          y: 0,
          z: 0.2
        }
      });
    });

    storage.setItem(controller.USER_ID_KEY, 'helloworld');

    controller.createClient(
      sock.client,
      storage,
      new THREE.Scene(),
      function(client, localAvatar) {
        expect(client).not.to.be(null);
        expect(storage.getItem('userId')).to.be('helloworld');
        expect(storage.getItem('userId')).to.be(localAvatar.entity.id);
        done();
      }
    );

    sock.server.emit('connect');
  });
});
