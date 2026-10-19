(() => {
  'use strict';
  window.MaloPrototype.createTrack = (T, id = 'azur') => {
    const layouts = {
      azur: [
      [-65, 0, 95], [35, 0, 100], [106, 0, 62], [104, 0, -20],
      [55, 0, -87], [-25, 0, -96], [-106, 0, -56], [-118, 0, 28]
      ],
      neon: [[-65,0,100],[25,0,110],[105,0,65],[68,0,0],[113,0,-65],[35,0,-110],[-45,0,-65],[-115,0,-90],[-127,0,0]],
      desert: [[-95,0,95],[45,0,110],[135,0,50],[90,0,-25],[120,0,-90],[0,0,-115],[-125,0,-70],[-135,0,20]]
    };
    const curve = new T.CatmullRomCurve3(layouts[id].map(p => new T.Vector3(...p)), true, 'catmullrom', .45);
    curve.arcLengthDivisions = 1600;
    const points = Array.from({ length: 480 }, (_, i) => {
      const p = curve.getPointAt(i / 480), tangent = curve.getTangentAt(i / 480);
      return { x: p.x, z: p.z, tx: tangent.x, tz: tangent.z };
    });
    return { id, points, halfWidth: 8, length: curve.getLength(), gates: Array.from({ length: 8 }, (_, i) => ({ ...points[i * 60] })) };
  };
})();
