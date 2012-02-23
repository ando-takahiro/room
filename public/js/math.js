var math = (function() {
  var exports = {};

  exports.v3 = function(x, y, z) {
    return new THREE.Vector3(x, y, z);
  };

  exports.v4 = function(x, y, z, w) {
    return new THREE.Vector4(x, y, z, w);
  };

  exports.plane = function(org, normal) {
    normal = normal.clone();
    normal.normalize();
    return exports.v4(normal.x, normal.y, normal.z, -normal.dot(org));
  };

  exports.intersectRayAndPlane = function(rayOrg, rayDir, plane) {
    var n = new THREE.Vector3();
    n.copy(plane);

    var t = -(rayOrg.dot(n) + plane.w) / rayDir.dot(n);
    if (t >= 0) {
      return rayOrg.clone().addSelf(rayDir.clone().multiplyScalar(t));
    } else {
      return null;
    }
  };

  return exports;
})();
