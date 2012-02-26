var logging = (function() {
  var exports = {};

  function Logger() {
    this.logs = [];
  }

  Logger.prototype.restore = function(id, dom) {
    this.id = id;
    this.dom = dom;
    this.dom.html('');
    for (var i = 0; i < this.logs.length; i++) {
      this._show(this.logs[i]);
    }
  };

  Logger.prototype._show = function(msg) {
    this.dom.prepend(Mustache.to_html($('#log-template').html(), msg));
  };

  Logger.prototype.push = function(msg) {
    if (typeof msg === 'string') {
      msg = {message: msg};
    } else {
      msg = _.clone(msg);
    }
    _.defaults(msg, {
      date: +new Date(),
      user: this.id
    });

    this.logs.push(msg);

    if (this.dom) {
      this._show(msg);
    }
  };

  exports.Logger = Logger;

  return exports;
})();
