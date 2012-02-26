function MockClient(src) {
  this.db = (src && src.db) || {};
  this.revision = (src && src.revision) || {}; // for transaction
  this.listeners = (src && src.listeners) || {};
  this.ttlMap = {};
  this.watching = {};
  this.immediately = (!src || src.immediately);
}

exports.MockClient = MockClient;

MockClient.prototype.set = function(k, v, callback) {
  this.db[k] = v.toString();
  if (callback) {
    callback(null, 'OK');
  }
};

function immediateBlock(mock, f) {
  var org = mock.immediately, result;
  mock.immediately = true;
  try {
    result = f();
  } finally {
    mock.immediately = org;
  }
  return result;
}

MockClient.prototype.setex = function(k, sec, v, callback) {
  var that = this;
  immediateBlock(that, function() {
    that.set(k, v);
    that.expire(k, sec);
  });
  callback && callback(null, 'OK');
};

MockClient.prototype.getset = function(k, v, callback) {
  var that = this, prev = that.db[k];
  if (typeof prev === 'object') {
    callback && callback(new Error('ERR Operation against a key holding the wrong kind of value'));
  } else {
    that.set(k, v, function(err) {
      callback && callback(err, prev !== undefined ? prev : null);
    });
  }
};

MockClient.prototype.setnx = function(k, v, callback) {
  var that = this, reply;
  immediateBlock(that, function() {
    if (!(k in that.db)) {
      that.set(k, v);
      reply = 1;
    } else {
      reply = 0;
    }
  });
  callback && callback(null, reply);
};

MockClient.prototype.get = function(k, callback) {
  if (typeof this.db[k] === 'object') {
    callback(new Error('error'), null);
  } else {
    callback(null, k in this.db ? this.db[k] : null);
  }
};

MockClient.prototype.incrby = function(k, inc, callback) {
  if (!this.db[k]) {
    this.db[k] = '0';
  }
  var num = parseInt(this.db[k], 10);
  if (num.toString() === this.db[k]) {
    num += inc;
    this.db[k] = num.toString();
    if (callback) {
      callback(null, num);
    }
  } else {
    if (callback) {
      callback(new Error('error'), null);
    }
  }
};

MockClient.prototype.del = function() {
  var cnt = 0;
  this._repeatCommand(
    arguments,
    function(k) {
      if (k in this.db) {
        ++cnt;
        delete this.db[k];
      }
    },
    function() {
      return cnt;
    }
  );
};

MockClient.prototype._pushCommon = function(doInsert, args) {
  var key = args[0], list = this.db[key];
  if (list !== null && list !== undefined) {
    if (!(list instanceof Array)) {
      (args[args.length - 1])(new Error('ERR Operation against a key holding the wrong kind of value'));
      return;
    }
  } else {
    list = this.db[key] = [];
  }

  this._repeatCommand(
    Array.prototype.slice.call(args, 1),
    function(v) {
      doInsert(list, String(v));
    },
    function() {
      return list.length;
    }
  );

  this.notify(key);
}

MockClient.prototype.lpush = function() {
  this._pushCommon(
    function(list, value) {
      list.unshift(value);
    },
    arguments
  );
};


MockClient.prototype.rpush = function() {
  this._pushCommon(
    function(list, value) {
      list.push(value);
    },
    arguments
  );
  //var list = this.db[key];
  //if (list !== null && list !== undefined) {
  //  if (!(list instanceof Array)) {
  //    (arguments[arguments.length - 1])(new Error('ERR Operation against a key holding the wrong kind of value'));
  //    return;
  //  }
  //} else {
  //  list = this.db[key] = [];
  //}

  //this._repeatCommand(
  //  Array.prototype.slice.call(arguments, 1),
  //  function(v) {
  //    list.push(String(v));
  //  },
  //  function() {
  //    return list.length;
  //  }
  //);

  //this.notify(key);
};

function normalizeIndex(idx, len) {
  return idx >= 0 ? idx : len + idx;
}

MockClient.prototype.lrange = function(key, first, last, callback) {
  var val = this.db[key];
  if (val !== null && val !== undefined) {
    if (!(val instanceof Array)) {
      callback(new Error('Error: ERR Operation against a key holding the wrong kind of value'));
      return;
    }
    first = normalizeIndex(first, val.length);
    last = normalizeIndex(last, val.length);
    callback(null, val.slice(first, last - first + 1));
  } else {
    callback(null, []);
  }
};

MockClient.prototype.blpop = function(key, timeout, callback) {
  var val = this.db[key];
  if (val) {
    if (!(val instanceof Array)) {
      callback(new Error(), null);
      return;
    }
  } else {
    val = this.db[key] = [];
  }
  if (val.length > 0) {
    callback(null, [key, val.shift()]);
  } else {
    this.addListner(key, function() {
        callback(null, [key, val.shift()]);
    });
  }
};

MockClient.prototype.sadd = function(key) {
  var set = this.db[key];
  if (set !== null && set !== undefined) {
    if (set.constructor !== Object) {
      (arguments[arguments.length - 1])(new Error('ERR Operation against a key holding the wrong kind of value'));
      return;
    }
  } else {
    set = this.db[key] = {};
  }

  var count = 0;
  this._repeatCommand(
    Array.prototype.slice.call(arguments, 1),
    function(member) {
      count += (member in set) ? 0 : 1;
      set[member] = true;
    },
    function() {
      return count;
    }
  );
};

MockClient.prototype.smembers = function(key, callback) {
  var val = this.db[key];
  if (val) {
    if (val.constructor !== Object) {
      callback(new Error(), null);
      return;
    }
  } else {
    val = {};
  }
  var keys = _.keys(val);
  callback(null, keys);
};

MockClient.prototype._multiPairedCommand = function(args, worker, reporter) {
  var key = args[0],
      kvs = Array.prototype.slice.call(args, 1),
      callback;

  if (typeof kvs[kvs.length - 1] === 'function') {
    callback = kvs.pop();
  }

  if (kvs.length & 1 && callback) {
    callback(new Error(), null);
    return;
  }

  var hash = this.db[key];
  if (!hash) {
    this.db[key] = hash = {};
  }

  if (hash.constructor !== Object) {
    if (callback) {
      callback(new Error());
    }
    return;
  }

  for (var i = 0; i < kvs.length; i += 2) {
    worker.call(this, hash, kvs[i], kvs[i + 1]); 
  }

  if (callback) {
    callback(null, reporter());
  }
};

MockClient.prototype.hset = function(key, field, value, callback) {
  var alreadyExists = 0;
  this._multiPairedCommand(
    arguments,
    function(hash, k, v) {
      alreadyExists = k in hash ? 0 : 1;
      hash[k] = v;
    },
    function() {return alreadyExists;}
  );
};

MockClient.prototype.hmset = function(key) {
  this._multiPairedCommand(
    arguments,
    function(hash, k, v) {
      hash[k] = v;
    },
    function() {return 'OK';}
  );
};

MockClient.prototype.hget = function(key, field, callback) {
  var val = this.db[key];
  if (val) {
    if (val.constructor === Object) {
      callback(null, field in val ? val[field] : null);
    } else {
      callback(new Error(), null);
    }
  } else {
    callback(null, null);
  }
};

MockClient.prototype.hgetall = function(key, callback) {
  var val = this.db[key];
  if (val) {
    if (val.constructor === Object) {
      callback(null, val);
    } else {
      callback(new Error(), null);
    }
  } else {
    callback(null, {});
  }
};

MockClient.prototype.zadd = function(key) {
  var count = 0;
  this._multiPairedCommand(
    arguments,
    function(hash, score, member) {
      if (typeof score !== 'number' || Math.floor(score) !== score) {
        throw new Error('invalid store:' + score);
      }
      count += (member in hash) ? 0 : 1;
      hash[member] = score;
    },
    function() {return count;}
  );
};

MockClient.prototype.zrange = function(key, start, stop, withscores) {
  var callback = arguments[arguments.length - 1],
      zset = _(this.db[key]).chain().map(function(score, member) {
        return {score: score, member: member};
      }).sortBy(function(row) {
        return row.score;
      }).value();

  start = start >= 0 ? start : _(zset).size() + start;
  stop = stop >= 0 ? stop : _(zset).size() + stop;

  zset = zset.slice(start, stop + 1);

  callback(null, _.reduce(zset, function(ret, row) {
    if (withscores === 'WITHSCORES') {
      ret.push(row.member);
      ret.push(row.score.toString());
    } else {
      ret.push(row.member);
    }
    return ret;
  }, []));
};

MockClient.prototype.zcard = function(key, callback) {
  callback(null, _.size(this.db[key] || {}));
};

MockClient.prototype.watch = function(key, callback) {
  this.watching[key] = this.revision[key];
  callback && callback(null, 'ok');
};

MockClient.prototype.unwatch = function(callback) {
  this.watching = {};
  callback && callback(null, 'ok');
};

_.each(['watch', 'unwatch'], function(k) {
  var fn = MockClient.prototype[k];
  fn = reportErrorToCallback(fn);
  fn = wrapNextTick(fn);
  fn = withLogging(k, fn);
  MockClient.prototype[k] = fn;
});

MockClient.prototype.execCore = function(queue, callback) {
  var mock = this;
  for (var k in mock.watching) {
    if (mock.watching[k] !== mock.revision[k]) {
      // failed
      callback(null, null);
      mock.watching = {}; // force unwatch immediately
      return;
    }
  }

  var result = immediateBlock(mock, function() {
    var res = _.map(queue, function(command) {
      var cbIndex = command.args.length - 1,
          cb = command.args[cbIndex],
          reply;

      if (typeof cb !== 'function') {
        ++cbIndex;
        cb = nop;
      }

      command.args[cbIndex] = function(err, val) {
        cb(err, val);
        reply = err || val;
      };

      mock[command.name].apply(mock, command.args);
      return reply
    });
    mock.watching = {}; // force unwatch immediately
    queue.length = 0;
    return res;
  });

  callback && callback(null, result);
};


// expire & getTimer func
function getTimer() {
  return (new Date()).getTime();
}

MockClient.prototype.expire = function(key, sec, callback) {
  if (key in this.db) {
    this.ttlMap[key] = getTimer() + sec * 1000;
    callback(null, 1);
  } else {
    callback(null, 0);
  }
};


// attach ttl feature
function wrapTtlFeature(org) {
  return function(key) {
    // check ttl
    if (key in this.ttlMap) {
      if (getTimer() >= this.ttlMap[key]) {
        delete this.ttlMap[key];
        delete this.db[key];
      }
    }
    // do call org func
    return org.apply(this, arguments);
  };
}

function wrapNextTick(org) {
  return function() {
    if (this.immediately) {
      return org.apply(this, arguments);
    } else {
      var args = arguments, that = this;
      process.nextTick(function() {
        org.apply(that, args);
      });
    }
  };
}

function withLogging(name, org) {
  return function() {
    //console.log(name, arguments);
    return org.apply(this, arguments);
  };
}

function reportErrorToCallback(org) {
  return function() {
    try {
      return org.apply(this, arguments);
    } catch(e) {
      if (!this.killLog) {
        console.error(e && e.stack);
      }
      var callback = arguments[arguments.length - 1];
      if (typeof callback === 'function') {
        callback(e);
      }
    }
  };
}

function revisionPolicy(funcName, orgFunc) {
  function unlessNullReply(that, args, err, reply) {
    return reply === null || reply === undefined;
  }

  function unlessZeroReply(that, args, err, reply) {
    return reply !== 0;
  }

  function unlessError(that, args, err, reply) {
    return !err;
  }

  function incrementRange(first, last, checker) {
    return function (that, args, err, reply) {
      if (!checker || checker(that, args, err, reply)) {
        var l = last;
        if (l === -1) {
          if (typeof args[args.length - 1] === 'function') {
            l = args.length - 1;
          } else {
            l = args.length;
          }
        }

        for (var i = first; i < l; ++i) {
          that._incrementRevision(args[i]);
        }
      }
    };
  }

  var policy;
  switch (funcName) {
  case 'get':
  case 'lrange':
  case 'smembers':
  case 'hget':
  case 'hgetall':
  case 'zrange':
  case 'zcard':
  case 'watch':
  case 'unwatch':
  case 'execCore':
  case 'multi':
    policy = nop;
    break;

  case 'blpop':
    policy = incrementRange(0, 1, unlessNullReply);
    break;

  case 'setnx':
    policy = incrementRange(0, 1, unlessZeroReply);
    break;

  case 'getset':
    policy = incrementRange(0, 1, unlessError);
    break;

  case 'set':
  case 'setex':
  case 'incrby':
  case 'lpush':
  case 'rpush':
  case 'sadd':
  case 'hset':
  case 'hmset':
  case 'zadd':
  case 'expire':
    policy = incrementRange(0, 1);
    break;

  case 'del':
    policy = incrementRange(0, -1);
    break;

  default:
    throw new Error('unknown revision policy:' + funcName);
  }

  return function() {
    var args = Array.prototype.slice.call(arguments, 0),
        orgCallback = args[args.length - 1],
        that = this;

    if (typeof orgCallback === 'function') {
      args[args.length - 1] = function(err, reply) {
        policy(that, args, err, reply);
        orgCallback(err, reply);
      };
    } else {
      args.push(function(err, reply) {
        policy(that, args, err, reply);
      });
    }

    return orgFunc.apply(this, args);
  };
}

var noneMultiMembers = {
  multi: true, watch: true, unwatch: true
};
for (var k in MockClient.prototype) {
  var fn = MockClient.prototype[k];
  if (typeof fn === 'function' && k[0] !== '_') {
    fn = reportErrorToCallback(fn);
    fn = revisionPolicy(k, fn);
    fn = wrapTtlFeature(fn);
    if (!noneMultiMembers[k]) {
      fn = wrapNextTick(fn);
    }
    fn = withLogging(k, fn);

    MockClient.prototype[k] = fn;
  }
}


//
// special commands
// ----------------
//
// without special services (ttl, logging, watch...)
//
function Multi(mock) {
  this.mock = mock;
  this.queue = [];
}

_.each(MockClient.prototype, function(f, n) {
  if (!noneMultiMembers[n]) {
    Multi.prototype[n] = function() {
      this.queue.push({name: n, args: Array.prototype.slice.call(arguments, 0)});
      return this;
    };
  }
});

Multi.prototype.exec = function(callback) {
  var mock = this.mock;
  mock.execCore(this.queue, callback);
};

MockClient.prototype.addListner = function(key, callback) {
  (this.listeners[key] = this.listeners[key] || []).push(callback);
};

MockClient.prototype.notify = function(key) {
  if (this.listeners[key]) {
    for (var k in this.listeners[key]) {
      this.listeners[key].shift()();
      if (this.db[key].length > 0) {
        break;
      }
    }
  }
};

MockClient.prototype._incrementRevision = function(key) {
  if (!(key in this.revision)) {
    this.revision[key] = 0;
  }
  ++this.revision[key];
};

MockClient.prototype._repeatCommand = function(args, worker, reporter) {
  var tail = args[args.length - 1],
      callback,
      that = this,
      keyCount = args.length;

  if (typeof tail === 'function') {
    callback = tail;
    --keyCount;
  }

  immediateBlock(this, function() {
    for (var i = 0; i < keyCount; ++i) {
      worker.call(that, args[i]);
    }
  });

  callback && callback(null, reporter());
};

MockClient.prototype.on = function(ev, callback) {
  if (ev === 'ready') {
    callback();
  }
};

function nop() {}

MockClient.prototype.removeAllListeners = nop;

MockClient.prototype.emit = nop;

MockClient.prototype.end = nop;

MockClient.prototype.multi = function() {
  return new Multi(this);
};

// create func
exports.createClient = function(src) {
  return new MockClient(src);
};
