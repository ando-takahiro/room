var expect = require('expect.js'),
    fs = require('fs'),
    vm = require('vm'),
    EPSILON = 0.0000001;

global.window = global;
window.self = global;
vm.runInThisContext(fs.readFileSync('public/vendor/three.js/Three.js'));
vm.runInThisContext(fs.readFileSync('public/js/math.js'));

describe('math.plane', function() {
  it('calcs plane 4 dimeension vector', function() {
    expect(Math.abs(
      math.plane(
        math.v3(1, 1, 1), // 平面原点
        math.v3(0, 1, 0) // 法線
      ).dot(
        math.v4(-20.123, 1, 20, 1) // 任意点(平面上)
      )) < EPSILON).to.be(true);

    expect(Math.abs(
      math.plane(
        math.v3(1, 1, 1), // 平面原点
        math.v3(0, 1, 0) // 法線
      ).dot(
        math.v4(-20.123, 2, 20, 1) // 任意点(平面「外」)
      )) < EPSILON).to.be(false);
  });
});

describe('math.intersectRayAndPlane', function() {
  it('returns intersection position', function() {
    var actual = math.intersectRayAndPlane(
      math.v3(1, -1, 1), math.v3(0, 1, 0),
      math.plane(math.v3(0, 0.5, 0), math.v3(0, 1, 0)));

    expect(actual.distanceTo(math.v3(1, 0.5, 1)) < EPSILON).to.be(true);
  });

  it('returns null if intersection is not found', function() {
    var actual = math.intersectRayAndPlane(
      math.v3(1, -1, 1), math.v3(0, -1, 0),
      math.plane(math.v3(0, 0.5, 0), math.v3(0, 1, 0)));

    expect(actual).to.be(null);
  });
});
