var loaded = {},
    fs = require('fs'),
    vm = require('vm');

global.window = global;
window.self = global;

exports.load = function(path) {
  if (!(path in loaded)) {
    vm.runInThisContext(fs.readFileSync(path));
    loaded[path] = true;
  }
};

// default modules
exports.load('public/vendor/three.js/Three.js');
