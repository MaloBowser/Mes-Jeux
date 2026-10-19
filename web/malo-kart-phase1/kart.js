(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createKart = (T, choice) => {
    const driver = api.drivers[choice.driver], vehicle = api.vehicles[choice.vehicle];
    const root = new T.Group(), body = new T.Group(), pilot = new T.Group(); root.add(body); body.add(pilot);
    const mat = (color, roughness = .7, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const dark = mat('#152735'), white = mat('#fff3de'), suit = mat(driver.color), skin = mat('#f1bd8c'), hair = mat('#51382e');
    const paint = new T.MeshPhysicalMaterial({ color: api.paints[choice.paint].color || vehicle.color, roughness: .25, metalness: choice.paint === 'gold' ? .7 : .3, clearcoat: 1 });
    const sphere = new T.SphereGeometry(1, 20, 14), rounded = new T.BoxGeometry(1, 1, 1, 5, 5, 5), vertices = rounded.attributes.position;
    for (let i = 0; i < vertices.count; i++) { const p = new T.Vector3().fromBufferAttribute(vertices, i), core = p.clone().clampScalar(-.35, .35); p.sub(core).normalize().multiplyScalar(.15).add(core); vertices.setXYZ(i, p.x, p.y, p.z); }
    rounded.computeVertexNormals();
    function mesh(geometry, material, p, scale, parent = body) { const obj = new T.Mesh(geometry, material); obj.position.set(...p); obj.scale.set(...scale); obj.castShadow = obj.receiveShadow = true; parent.add(obj); return obj; }
    const box = (m, p, s, parent) => mesh(rounded, m, p, s, parent);
    const ball = (m, p, s, parent) => mesh(sphere, m, p, s, parent);
    const long = choice.vehicle === 'turbo', small = choice.vehicle === 'compact';
    const length = long ? 1.16 : small ? .83 : 1, width = small ? .88 : 1;
    box(dark, [0, .42, 0], [1.6 * width, .23, 2.7 * length]);
    box(paint, [0, .66, .85 * length], [1.3 * width, .45, 1.5 * length]);
    ball(paint, [0, .63, 1.4 * length], [.76 * width, .24, .5]);
    box(white, [0, .9, .9 * length], [.17, .025, 1.1 * length]);
    for (const side of [-1, 1]) {
      box(paint, [side * .83 * width, .62, -.2], [.4, .4, 1.5 * length]);
      box(dark, [side * .85 * width, .67, .12], [.42, .12, .4]);
      box(dark, [side * .6, .74, -1.2 * length], [.1, .55, .1]);
    }
    box(paint, [0, long ? 1.25 : 1.05, -1.2 * length], [long ? 2.1 : 1.8 * width, .14, .48]);
    box(dark, [0, .4, 1.75 * length], [1.85 * width, .15, .16]);
    box(dark, [0, .94, -.5], [.77, .8, .25]);
    const metal = mat('#a5c1c9', .25, .8);
    for (const side of long ? [-1, 1] : [1]) {
      const exhaust = mesh(new T.CylinderGeometry(.1, .1, .55, 12), metal, [side * .6, .53, -1.4 * length], [1, 1, 1]); exhaust.rotation.x = Math.PI / 2;
    }
    const wheels = [];
    for (const x of [-1, 1]) for (const z of [-.86, .97]) {
      const pivot = new T.Group(); pivot.position.set(x * width, .4, z * length); root.add(pivot);
      const tire = mesh(new T.CylinderGeometry(.4, .4, long ? .44 : .36, 24), dark, [0, 0, 0], [1, 1, 1], pivot); tire.rotation.z = Math.PI / 2;
      const rim = mesh(new T.CylinderGeometry(.25, .25, long ? .46 : .38, 16), metal, [0, 0, 0], [1, 1, 1], pivot); rim.rotation.z = Math.PI / 2;
      const spokes = [];
      for (let spoke = 0; spoke < 5; spoke++) { const spokeMesh = box(white, [x * (long ? .235 : .195), 0, 0], [.02, .42, .045], pivot); spokeMesh.rotation.x = spoke * Math.PI / 5; spokes.push(spokeMesh); }
      wheels.push({ pivot, tire, rim, spokes, front: z > 0 });
    }
    ball(suit, [0, 1.17, -.1], [choice.driver === 'rocky' ? .43 : .34, .43, .28], pilot);
    box(white, [0, 1.18, .16], [.11, .46, .03], pilot);
    for (const side of [-1, 1]) {
      const arm = mesh(new T.CylinderGeometry(.12, .12, .6, 10), suit, [side * .33, 1.19, .18], [1, 1, 1], pilot); arm.rotation.x = -.8; arm.rotation.z = side * .25;
      ball(white, [side * .31, 1.02, .44], [.13, .13, .13], pilot);
      box(dark, [side * .23, .64, .47], [.24, .22, .42], pilot);
    }
    if (choice.driver === 'zephyr') {
      box(metal, [0, 1.87, -.08], [.82, .72, .69], pilot);
      box(dark, [0, 1.88, .28], [.7, .39, .04], pilot);
      const glow = new T.MeshStandardMaterial({ color: '#64fff1', emissive: '#32e5d6', emissiveIntensity: 2 });
      for (const side of [-1, 1]) { box(glow, [side * .18, 1.91, .32], [.12, .16, .03], pilot); box(metal, [side * .28, 2.35, -.1], [.055, .35, .055], pilot); ball(glow, [side * .28, 2.54, -.1], [.09, .09, .09], pilot); }
    } else if (choice.driver === 'rocky') {
      ball(suit, [0, 1.86, -.05], [.48, .42, .42], pilot);
      for (const side of [-1, 1]) {
        const ear = mesh(new T.ConeGeometry(.19, .5, 4), suit, [side * .32, 2.28, -.12], [1, 1, .55], pilot); ear.rotation.z = -side * .22;
        ball(white, [side * .16, 1.74, .32], [.22, .18, .18], pilot);
        ball(dark, [side * .2, 1.97, .32], [.065, .095, .05], pilot);
      }
      ball(dark, [0, 1.78, .5], [.09, .07, .06], pilot);
      const tail = ball(suit, [0, 1.2, -.95], [.26, .28, .65], pilot); tail.rotation.x = -.7;
      ball(white, [0, 1.6, -1.35], [.2, .24, .25], pilot);
    } else {
      ball(skin, [0, 1.88, -.05], [.39, .4, .37], pilot);
      const hairColor = choice.driver === 'nova' ? mat('#6f3b9d') : hair;
      ball(hairColor, [0, 2.11, -.15], [.42, .23, .36], pilot);
      if (choice.driver === 'nova') {
        for (let i = 0; i < 3; i++) ball(hairColor, [0, 2.02 - i * .16, -.49 - i * .12], [.24 - i * .04, .22, .22], pilot);
        box(mat('#50e0e9'), [0, 2.15, .04], [.76, .08, .35], pilot);
      } else {
        ball(suit, [0, 2.16, -.14], [.42, .2, .37], pilot);
        box(mat('#ffc24e'), [0, 2.12, .23], [.64, .08, .3], pilot);
      }
      for (const side of [-1, 1]) { ball(white, [side * .15, 1.94, .28], [.105, .12, .055], pilot); ball(dark, [side * .15, 1.94, .33], [.052, .075, .025], pilot); }
      ball(skin, [0, 1.83, .32], [.09, .09, .1], pilot);
      box(dark, [0, 1.71, .29], [.13, .025, .025], pilot);
    }
    const steering = mesh(new T.TorusGeometry(.26, .04, 8, 20), dark, [0, 1.03, .48], [1, 1, 1]); steering.rotation.x = -.6;
    return { root, body, pilot, wheels, paint };
  };
})();
