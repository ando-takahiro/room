var sinon = require('sinon'),
    expect = require('expect.js'),
    browser = require('./browser');

function commandSpecs(it) {
  describe('get', function() {
    it('returns value to callback', function(done, client) {
      client.set('key', 'val');
      client.get('key', function(err, val) {
        expect(val).to.be('val');
        done();
      });
    });

    it('returns null if key not found', function(done, client) {
      client.get('undefinedkey', function(err, val) {
        expect(val).to.be(null);
        done();
      });
    });
  });

  describe('set', function() {
    it('returns OK to callback', function(done, client) {
      client.set('key', 'val', function(err, replies) {
        expect(replies).to.be('OK');
        done();
      });
    });

    it('always success', function(done, client) {
      client.del('key', function() {
        client.sadd('key', 'val', function() {
          client.set('key', 'val', function(err, replies) {
            expect(err).to.eql(null);
            expect(replies).to.be('OK');
            done();
          });
        });
      });
    });
  });

  describe('setex', function() {
    it('set value and ttl same time', function(done, client) {
      client.del('key');
      client.sadd('key', 'vvv');
      client.setex('key', 100, 'val', function(err, replies) {
        expect(err).to.eql(null);
        expect(replies).to.be('OK');
        done();
      });
    });
  });

  describe('setnx', function() {
    it('returns 1 if key does not exist', function(done, client) {
      client.del('key');
      client.setnx('key', 'val', function(err, replies) {
        expect(err).to.eql(null);
        expect(replies).to.be(1);
        done();
      });
    });

    it('returns 0 if key exists', function(done, client) {
      client.del('key');
      client.set('key', 'vvv');
      client.setnx('key', 'val', function(err, replies) {
        expect(err).to.eql(null);
        expect(replies).to.be(0);
        done();
      });
    });
  });

  describe('getset', function() {
    it('sets value and gets previous value', function(done, client) {
      client.del('key');
      client.getset('key', 'val', function(err, prev) {
        expect(err).to.eql(null);
        expect(prev).to.be(null);
        client.getset('key', 'val2', function(err, prev) {
          expect(err).to.eql(null);
          expect(prev).to.be('val');
          done();
        });
      });
    });

    it('fails if previous value was not string', function(done, client) {
      client.del('key');
      client.sadd('key', 'hohoho');
      client.getset('key', 'val', function(err, prev) {
        expect(err).not.to.eql(null);
        expect(prev).not.to.ok();
        done();
      });
    });
  });

  describe('incrby', function() {
    it('returns result to callback', function(done, client) {
      client.set('key', 1);
      client.incrby('key', 10, function(err, replies) {
        expect(replies).to.be(11);
        done();
      });
    });

    it('set 0 before incr if key not found', function(done, client) {
      client.del('key');
      client.incrby('key', 10, function(err, replies) {
        expect(replies).to.be(10);
        done();
      });
    });

    it('fails if key is not found', function(done, client) {
      client.del('key');
      client.set('key', 'hello');
      client.incrby('key', 10, function(err, replies) {
        expect(err).not.to.eql(null);
        expect(replies).not.to.ok();
        done();
      });
    });
  });

  describe('del', function() {
    it('deletes keys', function(done, client) {
      client.set('a', 100);
      client.set('b', 'hello');
      client.set('c', 'world');
      client.del('a', 'b', 'c', function(err, replies) {
        expect(replies).to.be(3);
        client.get('a', function(err, replies) {
          expect(replies).to.be(null);
          done();
        });
      });
    });

    it('ignores nonexist keys', function(done, client) {
      client.set('a', 100);
      client.del('b');
      client.set('c', 'world');
      client.del('a', 'b', 'c', function(err, replies) {
        expect(replies).to.be(2);
        done();
      });
    });
  });

  describe('rpush', function() {
    it('pushes string into tail', function(done, client) {
      client.del('a');
      client.rpush('a', 'hello', 'world', function(err, replies) {
        expect(replies).to.be(2);
        client.lrange('a', 0, -1, function(err, replies) {
          expect(replies).to.eql(['hello', 'world']);
          done();
        });
      });
    });

    it('fails when key is not list', function(done, client) {
      client.del('b');
      client.set('b', 100);
      client.rpush('b', 'hello', function(err, replies) {
        expect(err instanceof Error).to.be(true);
        expect(replies).to.be(undefined);
        done();
      });
    });
  });

  describe('lpush', function() {
    it('pushes string into front', function(done, client) {
      client.del('a');
      client.lpush('a', 'hello', 'world', function(err, replies) {
        expect(replies).to.be(2);
        client.lrange('a', 0, -1, function(err, replies) {
          expect(replies).to.eql(['world', 'hello']);
          done();
        });
      });
    });

    it('fails when key is not list', function(done, client) {
      client.del('b');
      client.set('b', 100);
      client.lpush('b', 'hello', function(err, replies) {
        expect(err instanceof Error).to.be(true);
        expect(replies).to.be(undefined);
        done();
      });
    });
  });

  describe('ltrim', function() {
    it('trims specified range', function(done, client) {
      client.del('a');
      client.rpush('a', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
      client.ltrim('a', 1, 3, function(err, replies) {
        expect(replies).to.be('OK');
        client.lrange('a', 0, -1, function(err, replies) {
          expect(replies).to.eql(['1', '2', '3']);
          done();
        });
      });
    });

    it('accepts -1 as tail', function(done, client) {
      client.del('a');
      client.rpush('a', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
      client.ltrim('a', 8, -1, function(err, replies) {
        expect(replies).to.be('OK');
        client.lrange('a', 0, -1, function(err, replies) {
          expect(replies).to.eql(['8', '9']);
          done();
        });
      });
    });

    it('fails when key is not list', function(done, client) {
      client.del('a');
      client.set('a', 100);
      client.ltrim('a', 1, 3, function(err, replies) {
        expect(err instanceof Error).to.be(true);
        expect(replies).to.be(undefined);
        done();
      });
    });
  });

  describe('lrange', function() {
    it('gets elements of range', function(done, client) {
      client.del('a');
      client.rpush('a', 'hello');
      client.rpush('a', 'world');
      client.rpush('a', 123);
      client.lrange('a', 0, 0, function(err, replies) {
        expect(replies).to.eql(['hello']);
      });
      client.lrange('a', 0, -1, function(err, replies) {
        expect(replies).to.eql(['hello', 'world', '123']);
        done();
      });
    });
  });

  describe('blpop', function() {
    it('pops front with blocking', function(done, client1, client2) {
      client1.del('a');
      client1.blpop('a', 1000, function(err, replies) {
        expect(replies).to.eql(['a', 'hello']);
        done();
      });
      client2.rpush('a', 'hello');
    });

    it('pops immediately when list has element', function(done, client) {
      client.del('a');
      client.rpush('a', 'hello');
      client.rpush('a', 'world');
      client.blpop('a', 1000, function(err, replies) {
        expect(replies).to.eql(['a', 'hello']);
        done();
      });
    });
  });

  describe('sadd', function() {
    it('adds into set, and reply 1 if member was not found before', function(done, client) {
      client.del('x');
      client.sadd('x', 'hello', function(err, replies) {
        expect(replies).to.eql(1);
        done();
      });
    });

    it('adds into set, and reply 0 if member was found before', function(done, client) {
      client.del('x');
      client.sadd('x', 'hello');
      client.sadd('x', 'hello', function(err, replies) {
        expect(replies).to.eql(0);
        done();
      });
    });

    it('fails if key is not set', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.sadd('x', 'hello', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });
  });

  describe('smembers', function() {
    it('replies all members in set', function(done, client) {
      client.del('x');
      client.sadd('x', 'hello');
      client.sadd('x', 'world');
      client.smembers('x', function(err, replies) {
        expect(replies.length).to.be(2);
        var set = {hello: true, world: true};
        expect(set[replies[0]]).to.be(true);
        expect(set[replies[1]]).to.be(true);
        expect(replies[1]).not.to.be(replies[0]);
        done();
      });
    });

    it('fails if key is not set', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.smembers('x', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });
  });

  describe('hset', function() {
    it('sets value into hash', function(done, client) {
      client.del('x');
      client.hset('x', 'a', 'b', function(err, replies) {
        expect(err).to.be(null);
        expect(replies).to.be(1);
        client.hgetall('x', function(err, replies) {
          expect(replies).to.eql({
            a: 'b'
          });
          client.hset('x', 'a', 'c', function(err, replies) {
            expect(err).to.be(null);
            expect(replies).to.be(0); // means updated
            client.hgetall('x', function(err, replies) {
              expect(replies).to.eql({
                a: 'c'
              });
              done();
            });
          });
        });
      });
    });

    it('fails if key is not hash', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.hset('x', 'a', 'b', function(err, replies) {
        expect(err).to.be.a(Error);
        done();
      });
    });
  });

  describe('hget', function() {
    it('gets value of field in hash', function(done, client) {
      client.del('x');
      client.hset('x', 'a', 'b');
      client.hget('x', 'a', function(err, val) {
        expect(err).to.be(null);
        expect(val).to.eql('b');
        done();
      });
    });

    it('returns null if field is not in hash', function(done, client) {
      client.del('x');
      client.hset('x', 'n', 'm');
      client.hget('x', 'a', function(err, val) {
        expect(err).to.be(null);
        expect(val).to.be(null);
        done();
      });
    });

    it('returns null if key is not exist', function(done, client) {
      client.del('x');
      client.hget('x', 'a', function(err, val) {
        expect(err).to.be(null);
        expect(val).to.be(null);
        done();
      });
    });

    it('fails if key exists and is not hash', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.hget('x', 'a', function(err, replies) {
        expect(err).to.be.a(Error);
        done();
      });
    });
  });

  describe('hmset', function() {
    it('sets multi values at once into hash', function(done, client) {
      client.del('x');
      client.hmset(
        'x',
        'a', 'b',
        'c', 'd',
        'e', 'f',
        function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.eql('OK');
          client.hgetall('x', function(err, replies) {
            expect(replies).to.eql({
              a: 'b',
              c: 'd',
              e: 'f'
            });
            done();
          });
        }
      );
    });

    it('fails if key is not hash', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.hmset('x', 'a', 'b', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });
  });

  describe('hgetall', function() {
    it('gets all values of hash', function(done, client) {
      client.del('x');
      client.hmset(
        'x',
        'a', 'b',
        'c', 'd',
        'e', 'f');
      client.hgetall('x', function(err, replies) {
        expect(err).to.be(null);
        expect(replies).to.eql({
          a: 'b',
          c: 'd',
          e: 'f'
        });
        done();
      });
    });

    it('fails if key is not hash', function(done, client) {
      client.del('x');
      client.set('x', 'y');
      client.hgetall('x', function(err, replies) {
        expect(err).to.be.a(Error);
        expect(replies).not.to.ok();
        done();
      });
    });
  });

  describe('zadd', function() {
    it('adds or updates score, member pairs', function(done, client) {
      client.del('x');
      client.zadd(
        'x',
        123, 'b',
        456, 'd',
        222, 'f',
        function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.eql(3);
          client.zrange('x', 0, -1, function(err, replies) {
            expect(replies).to.eql(['b', 'f', 'd']);
            client.zadd(
              'x',
              223, 'b',
              456, 'x',
              111, 'f',
              function(err, added) {
                expect(err).to.be(null);
                expect(added).to.be(1);
                done();
              }
            );
          });
        }
      );
    });

    it('fails if key is not hash', function(done, client) {
      client.del('x');
      client.rpush('x', 'hello');
      client.zadd('x', 'a', 'b', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });

    it('fails if args is not paired', function(done, client) {
      client.del('x');
      client.zadd('x', 'a', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });

    it('fails if score is not integer', function(done, client) {
      client.del('x');
      if (client.db) {
        client.killLog = true; // kill error log when mock
      }
      client.zadd('x', 'a', 'b', function(err, replies) {
        expect(err).not.to.eql(null);
        done();
      });
    });
  });

  describe('zrange', function() {
    it('collects members within specified range', function(done, client) {
      client.del('x');
      client.zadd('x', 111, 'b', 12, 'c', 33, 'a', -20, 'k', function(err, replies) {
        client.zrange('x', 0, -1, function(err, replies) {
          expect(replies).to.eql(['k', 'c', 'a', 'b']);
          client.zrange('x', -1, -1, function(err, replies) {
            expect(replies).to.eql(['b']);
            client.zrange('x', 1, 2, function(err, replies) {
              expect(replies).to.eql(['c', 'a']);
              done();
            });
          });
        });
      });
    });

    it('returns score when "WITHSCORES"', function(done, client) {
      client.del('x');
      client.zadd('x', 111, 'b', 12, 'c', 33, 'a', -20, 'k', function(err, replies) {
        client.zrange('x', 0, -1, 'WITHSCORES', function(err, replies) {
          expect(replies).to.eql(['k', '-20', 'c', '12', 'a', '33', 'b', '111']);
          client.zrange('x', -1, -1, 'WITHSCORES', function(err, replies) {
            expect(replies).to.eql(['b', '111']);
            client.zrange('x', 1, 2, 'WITHSCORES', function(err, replies) {
              expect(replies).to.eql(['c', '12', 'a', '33']);
              done();
            });
          });
        });
      });
    });
  });

  describe('zcard', function() {
    it('counts member', function(done, client) {
      client.del('x');
      client.zadd('x', 111, 'b', 12, 'c', 33, 'a', -20, 'k', function(err, replies) {
        expect(replies).to.be(4);
        done();
      });
    });

    it('return 0 if key does not exist', function(done, client) {
      client.del('x');
      client.zcard('x', function(err, replies) {
        expect(replies).to.be(0);
        done();
      });
    });
  });

  describe('multi', function() {
    it('processes multiple commands atomically', function(done, client1, client2) {
      var m = client1.multi().set('aaa', 'bbb').set('xxx', 'yyy');
      expect(m).not.to.eql(null);
      client2.del('aaa');
      client2.del('xxx');
      client2.set('aaa', 'xxx', function() {
        client2.get('aaa', function(e, val) {
          expect(val).to.be('xxx');
          client2.get('xxx', function(e, val) {
            expect(val).to.eql(null);
            m.exec(function(e, reply) {
              expect(reply).not.to.be(null);
              client2.get('aaa', function(e, val) {
                expect(val).to.be('bbb');
                client2.get('xxx', function(e, val) {
                  expect(val).to.be('yyy');
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('accepts *multiple* multi object', function(done, client1, client2) {
      var m1 = client1.multi().set('aaa', 'bbb').set('xxx', 'yyy'),
          m2 = client1.multi().set('xxx', 'zzz').set('aaa', 'ccc');

      client1.del('aaa', 'xxx', function() {
        m2.exec();
        var m3 = client1.multi().set('xxx', 'www').set('aaa', 'ddd');
        m1.exec(function(e, reply) {
          expect(reply).not.to.be(null);
          client2.get('aaa', function(e, val) {
            expect(val).to.be('bbb');
            m3.exec();
            client2.get('xxx', function(e, val) {
              expect(val).to.be('www');
              done();
            });
          });
        });
      });
    });

    it('fails when key was modified after watch', function(done, client1, client2) {
      client1.watch('aaa');
      var m = client1.multi().set('aaa', 'bbb').set('xxx', 'yyy');
      expect(m).not.to.eql(null);
      client2.del('aaa', function() {
        m.exec(function(e, reply) {
          expect(reply).to.be(null);
          client1.get('aaa', function() {
            expect(reply).to.eql(null);
            done();
          });
        });
      });
    });

    it('successes when key was not modified after watch', function(done, client1, client2) {
      client1.del('aaa');
      client1.set('aaa', 'xxx');
      client1.watch('aaa');
      var m = client1.multi().set('aaa', 'bbb').set('xxx', 'yyy');
      expect(m).not.to.eql(null);
      m.exec(function(e, reply) {
        expect(reply).not.to.be(null);
        client1.get('aaa', function(e, reply) {
          expect(reply).to.be('bbb');
          done();
        });
      });
    });
  });
}

function mockSpecs(it) {
  describe('setex', function() {
    it('set value and ttl same time', function(done, client) {
      client.setex('key', 100, 'val', function(err, replies) {
        if (err) {
          console.log('#######', err.stack);
        }
        expect(err).not.to.ok();
        expect(replies).to.be('OK');
        var ttl = client.ttlMap.key, expected = +(new Date()) + 100 * 1000;
        expect(expected - client.ttlMap.key).to.be.within(-1000, 1000);
        done();
      });
    });
  });

  var orgIt = it;
  describe('revision', function() {
    var orgRev;
    function it(desc, body) {
      return orgIt(desc, function(done, client) {
        orgRev = _.clone(client.revision);
        return body(done, client);
      });
    }

    describe('get', function() {
      it('does not modify revision', function(done, client) {
        client.get('key', function(err, val) {
          expect(client.revision.key).to.be(orgRev.key);
          done();
        });
      });
    });

    describe('set', function() {
      it('modifies revision always', function(done, client) {
        client.set('key', 'aaa');
        client.set('key', 'aaa', function(err, val) {
          expect(client.revision.key).not.to.be(orgRev.key);
          done();
        });
      });
    });

    describe('setnx', function() {
      it('modifies revision if replied 1', function(done, client) {
        var rev;
        client.del('key', function() {
          rev = client.revision.key;
        });
        client.setnx('key', 'aaa', function(err, val) {
          expect(val).to.be(1);
          expect(client.revision.key).not.to.be(rev);
          done();
        });
      });

      it('does not modify revision if replied 0', function(done, client) {
        var rev;
        client.set('key', 'aaa', function() {
          rev = client.revision.key;
        });
        client.setnx('key', 'aaa', function(err, val) {
          expect(val).to.be(0);
          expect(client.revision.key).to.be(rev);
          done();
        });
      });
    });

    describe('getset', function() {
      it('modifies revision when none error', function(done, client) {
        var rev;
        client.del('key', function() {
          rev = client.revision.key;
        });
        client.getset('key', 'val', function(err, prev) {
          expect(err).to.eql(null);
          expect(prev).to.be(null);
          expect(client.revision.key).not.to.be(rev);
          done();
        });
      });


      it('does not modify revision when error', function(done, client) {
        var rev;
        client.del('key');
        client.sadd('key', 'hohoho', function() {
          rev = client.revision.key;
        });
        client.getset('key', 'val', function(err, prev) {
          expect(err).to.ok();
          expect(prev).not.to.ok();
          expect(client.revision.key).to.be(rev);
          done();
        });
      });
    });

    describe('del', function() {
      it('modifies revision always', function(done, client) {
        client.del('a', 'b', client.db.key, function(err, val) {
          expect(client.revision.a).not.to.be(orgRev.a);
          expect(client.revision.b).not.to.be(orgRev.b);
          var orgRev2 = _.clone(client.revision);
          client.del('a', 'b', client.db.key, function(err, val) {
            expect(client.revision.a).not.to.be(orgRev2.a);
            expect(client.revision.b).not.to.be(orgRev2.b);
            done();
          });
        });
      });
    });
  });
}

describe('redis', function() {
  describe('mock immediately', function() {
    var redis = require('./redis_mock');

    function _it(desc, func) {
      return it(desc, function() {
        var client = redis.createClient(), _done = false;

        function done() {
          _done = true;
        }

        func(done, client, redis.createClient(client));
        expect(_done).to.be(true);
      });
    }

    _it('changes createClient returning mock redis client', function(done, client) {
      expect(client).not.to.be(null);
      expect(client.db).to.eql({});
      done();
    });

    mockSpecs(_it);
    commandSpecs(_it);

    describe('expire', function() {
      var clock;

      before(function() {
        clock = sinon.useFakeTimers();
      });

      after(function() {
        clock.restore();
      });

      _it('return 1 if key exists, and remove keys after passed seconds', function(done, client) {
        client.del('x');
        client.set('x', 'y');
        clock.tick(0);
        client.expire('x', 1, function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.be(1);
        });

        clock.tick(999);

        client.get('x', function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.be('y');
        });

        clock.tick(1000);

        client.get('x', function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.be(null);
          done();
        });
      });

      _it('return 0 if key does not exists', function(done, client) {
        client.del('x');
        client.expire('x', 1, function(err, replies) {
          expect(err).to.eql(null);
          expect(replies).to.eql(0);
          done();
        });
      });
    });
  });

  describe('mock', function() {
    var redis = require('./redis_mock');

    function _it(desc, func) {
      return it(desc, function(done) {
        var client = redis.createClient();
        client.immediately = false;
        func(done, client, redis.createClient(client));
      });
    }

    it('changes createClient returning mock redis client', function() {
      var client = redis.createClient();
      expect(client).not.to.be(null);
      expect(client.db).to.eql({});
    });

    mockSpecs(_it);
    commandSpecs(_it);

    describe('expire', function() {
      var clock;

      before(function() {
        clock = sinon.useFakeTimers();
      });

      after(function() {
        clock.restore();
      });

      it('return 1 if key exists, and remove keys after passed seconds', function() {
        var client = redis.createClient();
        client.immediately = false;
        clock.tick(0);

        client.set('x', 'y');
        client.expire('x', 1, function(err, replies) {
          expect(err).to.be(null);
          expect(replies).to.be(1);
          clock.tick(998);

          client.get('x', function(err, replies) {
            expect(err).to.be(null);
            expect(replies).to.be('y');
            clock.tick(1000);

            client.get('x', function(err, replies) {
              expect(err).to.be(null);
              expect(replies).to.be(null);
            });
          });
        });
      });

      _it('return 0 if key does not exists', function(done, client) {
        client.del('x');
        client.expire('x', 1, function(err, replies) {
          expect(err).to.eql(null);
          expect(replies).to.eql(0);
          done();
        });
      });
    });
  });

  describe('real', function() {
    var redis = require('redis'),
        orgIt = global.it,
        client, client2;

    var it = function(desc, func) {
      return orgIt(desc, function(doneCore) {
        var that = this;
        function done() {
          client.end();
          client2.end();
          doneCore();
        }

        function waitRedis() {
          process.nextTick(function() {
            client = redis.createClient();
            client2 = redis.createClient();
            var ready = {};

            function onReady(name) {
              ready[name] = true;
              if (ready.client && ready.client2) {
                func.call(that, done, client, client2);
              }
            }

            client.on('ready', function() {
              onReady('client');
            });
            client2.on('ready', function() {
              onReady('client2');
            });
          });
        }
        waitRedis();
      });
    };

    it('changes createClient returning real redis client', function(done, client) {
      expect(client).not.to.be(null);
      expect(client.db).not.to.be(null);
      done();
    });

    commandSpecs(it);

    describe('expire', function() {
      it('returns 1 if key exists, and remove keys after passed seconds', function(done, client) {
        this.timeout(5000);
        process.nextTick(function() {
          client.del('x');
          client.set('x', 'y');
          client.expire('x', 1, function(err, replies) {
            expect(err).to.be(null);
            expect(replies).to.be(1);

            process.nextTick(function() {
              client.get('x', function(err, replies) {
                expect(err).to.be(null);
                expect(replies).to.be('y');
              });
            });

            setTimeout(function() {
              client.get('x', function(err, replies) {
                expect(err).to.be(null);
                expect(replies).to.be(null);
                done();
              });
            }, 2000);
          });
        });
      });

      it('returns 0 if key does not exists', function(done, client) {
        client.del('x');
        client.expire('x', 1, function(err, replies) {
          expect(err).to.eql(null);
          expect(replies).to.eql(0);
          done();
        });
      });
    });
  });
});
