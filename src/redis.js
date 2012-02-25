var redis = require('redis');

exports.setup = function(after) {
  var db = redis.createClient();

  db.on('error', function(e) {
    // [Redis ERROR POLICY]
    // * ignores error generall command process
    // * for a while, treats error only here
    console.error('redis error:', e);
  });

  after(db);
});
