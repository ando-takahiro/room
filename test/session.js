var expect = require('expect.js'),
    browser = require('./browser'),
    sinon = require('sinon'),
    util = require('util'),
    room = require('../src/room'),
    EventEmitter = require('events').EventEmitter,
    redis_mock = require('./redis_mock');

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
};

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
describe('controller.login', function() {
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
    if ('restore' in Math.random) {
      Math.random.restore();
    }
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

    sinon.stub(Math, 'random', function() {
      return 0;
    });

    controller.login(
      sock.client,
      storage,
      new THREE.Scene(),
      new EventEmitter(),
      function(localAvatar) {
        expect(storage.getItem('userId')).to.be(localAvatar.entity.id);
        var mesh = localAvatar.mesh;
        expect(mesh.position.x).to.be(-2.9);
        expect(mesh.position.y).to.be(8);
        expect(mesh.position.z).to.be.within(0.19999, 0.20001);
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

    controller.login(
      sock.client,
      storage,
      new THREE.Scene(),
      new EventEmitter(),
      function(localAvatar) {
        expect(storage.getItem('userId')).to.be('helloworld');
        expect(storage.getItem('userId')).to.be(localAvatar.entity.id);
        done();
      }
    );

    sock.server.emit('connect');
  });
});

describe('login in room', function() {
  var sockets, pair, db;

  beforeEach(function() {
    sockets = new EventEmitter();
    pair = MockSocket.makePair();
    db = redis_mock.createClient();
    room.restore(sockets, db);
  });

  it('creates new account with ""', function(done) {
    sockets.on('connection', function() {
      pair.client.on('welcome', function(message) {
        expect(message.you.id).to.be.a('string');
        expect(message.you.x).to.be.a('number');
        expect(message.you.y).to.be.a('number');
        expect(message.you.z).to.be.a('number');
        expect(message.you.avatar).to.be('images/avatar0.png');
        expect(message.members).to.be.a('object');
        done();
      });

      pair.client.emit('login', '');
    });

    sockets.emit('connection', pair.server);
  });

  it('loads account if existing user id', function(done) {
    var entity = {
      id: 'userId0',
      x: 123,
      y: 456,
      z: 789,
      avatar: 'avatar123.png'
    };

    db.set('account:userId0:entity', JSON.stringify(entity));

    sockets.on('connection', function() {
      pair.client.on('welcome', function(message) {
        expect(message.you).to.eql(entity);
        done();
      });

      pair.client.emit('login', 'userId0');
    });

    sockets.emit('connection', pair.server);
  });

  it('creates another account if specified account is in room', function(done) {
    var entity = {
          id: 'userId0',
          x: 123,
          y: 456,
          z: 789,
          avatar: 'avatar123.png'
        },
        entityStr = JSON.stringify(entity);

    db.set('account:userId0:entity', entityStr);
    db.hset(room.MEMBERS_KEY, entity.id, entityStr);

    sockets.on('connection', function() {
      pair.client.on('welcome', function(message) {
        expect(message.you).not.to.eql(entity);
        done();
      });

      pair.client.emit('login', 'userId0');
    });

    sockets.emit('connection', pair.server);
  });

  it('sends "hear" event if chat logs existing', function(done) {
    db.rpush(room.CHAT_KEY, 'aaa', 'bbb', 'ccc');

    sockets.on('connection', function() {
      pair.client.on('hear', function(msgs) {
        expect(msgs).to.eql(['aaa', 'bbb', 'ccc']);
        done();
      });

      pair.client.emit('login', '');
    });

    sockets.emit('connection', pair.server);
  });
});

describe('room events', function() {
  var sockets, pair, db, clock;

  beforeEach(function() {
    sockets = new EventEmitter();
    pair = MockSocket.makePair();
    db = redis_mock.createClient();
    room.restore(sockets, db);
    clock = sinon.useFakeTimers();
  });

  after(function() {
    clock.restore();
  });

  describe('say', function() {
    it('records message in db and broadcast', function(done) {
      clock.tick(123);
      var id;
      pair.server.broadcast.on('hear', function(msgs) {
        expect(msgs).to.have.length(1);

        var parsed = JSON.parse(msgs[0]);
        expect(parsed).to.be.eql({
          user: id,
          message: 'hello world',
          date: 123
        });

        expect(db.db[room.CHAT_KEY]).to.eql(msgs);
        done();
      });

      sockets.on('connection', function() {
        pair.client.on('welcome', function(message) {
          id = message.you.id;
          pair.client.emit('say', 'hello world');
        });

        pair.client.emit('login', '');
      });

      sockets.emit('connection', pair.server);
    });
  });

  describe('changeName', function() {
    it('change name and broadcast', function(done) {
      var id;
      pair.server.broadcast.on('updateName', function(msg) {
        expect(msg).to.eql({user: id, name: 'foobared'});
        var entity = JSON.parse(db.db[room.MEMBERS_KEY][id]);
        expect(entity.name).to.be('foobared');
        expect(entity.isInitialName).to.be(false);
        done();
      });

      sockets.on('connection', function() {
        pair.client.on('welcome', function(message) {
          id = message.you.id;
          expect(message.you.isInitialName).to.be(true);
          pair.client.emit('changeName', 'foobared');
        });

        pair.client.emit('login', '');
      });

      sockets.emit('connection', pair.server);
    });
  });

  describe('changeAvatar', function() {
    it('change avatar and broadcast', function(done) {
      var id;
      pair.server.broadcast.on('updateAvatar', function(msg) {
        expect(msg).to.eql({user: id, avatar: 'dummy-url'});
        var entity = JSON.parse(db.db[room.MEMBERS_KEY][id]);
        expect(entity.avatar).to.be('dummy-url');
        expect(entity.isInitialAvatar).to.be(false);
        done();
      });

      sockets.on('connection', function() {
        pair.client.on('welcome', function(message) {
          id = message.you.id;
          expect(message.you.isInitialAvatar).to.be(true);
          pair.client.emit('changeAvatar', 'dummy-url');
        });

        pair.client.emit('login', '');
      });

      sockets.emit('connection', pair.server);
    });
  });
});
