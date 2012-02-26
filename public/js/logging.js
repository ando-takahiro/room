var logging = (function() {
  var exports = {};

  function Logger(id, dom) {
    this.logs = [];
    this.id = id;
    this.dom = dom;
  }

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
