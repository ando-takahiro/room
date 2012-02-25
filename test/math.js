var expect = require('expect.js'),
    browser = require('./browser'),
    EPSILON = 0.0000001;

browser.load('public/js/math.js');

describe('math.plane', function() {
  it('calcs plane 4 dimeension vector', function() {
    expect(Math.abs(
      math.plane(
        math.v3(1, 1, 1), // origin of plane
        math.v3(0, 1, 0) // normal of plane
      ).dot(
        math.v4(-20.123, 1, 20, 1) // point in a plane
      )) < EPSILON).to.be(true);

    expect(Math.abs(
      math.plane(
        math.v3(1, 1, 1), // origin of plane
        math.v3(0, 1, 0) // normal of plane
      ).dot(
        math.v4(-20.123, 2, 20, 1) // outside of plane
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
