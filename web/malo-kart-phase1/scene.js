(() => {
  'use strict';
  window.MaloPrototype.createScene = (T, renderer, track, choice) => {
    const theme = window.MaloPrototype.courses[track.id], night = track.id === 'neon', desert = track.id === 'desert';
    const scene = new T.Scene();
    scene.background = new T.Color(theme.sky); scene.fog = new T.Fog(theme.fog, 200, 650);
    const camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, .1, 1100);
    const sun = new T.DirectionalLight(night ? '#8dbeff' : '#fff2d0', night ? 1.8 : 2.8);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 180 });
    sun.shadow.normalBias = .05;
    scene.add(sun, sun.target, new T.HemisphereLight('#d3f4ff', '#648444', 1.8));
    const material = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const white = material('#fff4da'), dark = material('#142f3c'), blue = material('#1479d0', .28, .25);
    const boxGeometry = new T.BoxGeometry(1, 1, 1);
    function mesh(geometry, mat, position, scale = [1, 1, 1], parent = scene) {
      const object = new T.Mesh(geometry, mat); object.position.set(...position); object.scale.set(...scale);
      object.castShadow = object.receiveShadow = true; parent.add(object); return object;
    }
    const box = (mat, p, s, parent) => mesh(boxGeometry, mat, p, s, parent);
    function texture(width, height, paint) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      paint(canvas.getContext('2d'), width, height);
      const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return map;
    }
    const roadMap = texture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#475a64'; ctx.fillRect(0, 0, w, h);
      let seed = 91;
      const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 3500; i++) { ctx.fillStyle = i % 2 ? '#ffffff0b' : '#0000000d'; ctx.fillRect(noise() * w, noise() * h, 1, 1); }
      ctx.fillStyle = '#f5e9cf'; ctx.fillRect(3, 0, 1, h); ctx.fillRect(w - 4, 0, 1, h);
      ctx.fillStyle = '#d3ddd455'; ctx.fillRect(w / 2 - 1, 18, 2, 45);
    });
    roadMap.wrapS = roadMap.wrapT = T.RepeatWrapping;
    function ribbon(a, b, mat, y) {
      const vertices = [], uv = [], indices = [];
      for (let i = 0; i <= track.points.length; i++) {
        const p = track.points[i % track.points.length];
        for (const side of [a, b]) { vertices.push(p.x + p.tz * side, y, p.z - p.tx * side); uv.push(side === a ? 0 : 1, i * track.length / track.points.length / 16); }
        if (i < track.points.length) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const object = mesh(geometry, mat, [0, 0, 0]); object.castShadow = false;
    }
    const sea = mesh(new T.PlaneGeometry(2200, 2200), material(theme.outer, .35, .15), [0, -1.2, 0]); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
    const beach = mesh(new T.CircleGeometry(185, 96), material('#efd29a'), [0, -.3, 0]); beach.rotation.x = -Math.PI / 2; beach.castShadow = false;
    const island = mesh(new T.CircleGeometry(174, 96), material(theme.ground), [0, -.05, 0]); island.rotation.x = -Math.PI / 2; island.castShadow = false;
    ribbon(-9.3, 9.3, white, .01);
    ribbon(-8, 8, new T.MeshStandardMaterial({ map: roadMap, roughness: .95 }), .04);
    const panels = new T.InstancedMesh(boxGeometry, white, track.points.length);
    const dummy = new T.Object3D();
    track.points.forEach((p, i) => {
      for (let side = 0; side < 2; side++) {
        const offset = side ? 8.25 : -8.25;
        dummy.position.set(p.x + p.tz * offset, .5, p.z - p.tx * offset);
        dummy.rotation.set(0, Math.atan2(p.tx, p.tz), 0); dummy.scale.set(.45, .9, track.length / track.points.length * 2.1); dummy.updateMatrix();
        if (i % 2 === 0) { const index = i + side; panels.setMatrixAt(index, dummy.matrix); panels.setColorAt(index, new T.Color(i % 12 < 6 ? theme.accent : '#fff1d0')); }
      }
    });
    panels.castShadow = panels.receiveShadow = true; scene.add(panels);
    const gates = track.gates.map((p, i) => {
      const group = new T.Group(); group.position.set(p.x, 0, p.z); group.rotation.y = Math.atan2(p.tx, p.tz); scene.add(group);
      const gateMaterial = material(i ? '#48c7b9' : '#ffd15a');
      for (const side of [-1, 1]) { box(dark, [side * 9, 2.7, 0], [.45, 5.4, .5], group); box(gateMaterial, [side * 9, 4.3, 0], [.6, 1.5, .65], group); }
      box(dark, [0, 5.6, 0], [18.6, .9, .55], group);
      const sign = texture(512, 64, (ctx, w, h) => {
        ctx.fillStyle = '#163746'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = i ? '#baf6df' : '#ffdf71';
        ctx.font = 'bold 31px Arial'; ctx.textAlign = 'center'; ctx.fillText(i ? `CHECKPOINT  0${i}` : window.MaloPrototype.courses[track.id].name.toUpperCase(), w / 2, 44);
      });
      const label = mesh(new T.PlaneGeometry(9, .8), new T.MeshBasicMaterial({ map: sign }), [0, 5.6, -.29], [1, 1, 1], group); label.rotation.y = Math.PI;
      const lineMap = texture(256, 32, (ctx, w, h) => {
        if (i) { ctx.fillStyle = '#7ce8d7'; ctx.fillRect(0, 0, w, h); }
        else for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { ctx.fillStyle = (x + y) % 2 ? '#142f3c' : '#fff4da'; ctx.fillRect(x * 16, y * 16, 16, 16); }
      });
      const line = mesh(new T.PlaneGeometry(15.9, i ? .3 : 2), new T.MeshStandardMaterial({ map: lineMap }), [0, .055, 0], [1, 1, 1], group); line.rotation.x = -Math.PI / 2; line.castShadow = false;
      return gateMaterial;
    });
    const trunks = [], crowns = [];
    for (let i = 0; i < 86; i++) {
      const angle = i * 2.39996, radius = 30 + ((i * 71) % 132), x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
      if (window.MaloPrototype.nearestPoint(track.points, x, z).distance < 15) continue;
      const h = 5 + i % 4;
      trunks.push([x, h * .35, z, .4, h * .7, .4]); crowns.push([x, h, z, 3 + i % 2, 2.3, 3 + i % 2]);
    }
    function instances(geometry, mat, entries) {
      const object = new T.InstancedMesh(geometry, mat, entries.length);
      entries.forEach((p, i) => { dummy.position.set(...p.slice(0, 3)); dummy.scale.set(...p.slice(3)); dummy.rotation.set(0, i, 0); dummy.updateMatrix(); object.setMatrixAt(i, dummy.matrix); });
      object.castShadow = object.receiveShadow = true; scene.add(object);
    }
    if (!desert) instances(new T.CylinderGeometry(1, 1.3, 1, 7), material('#88674a'), trunks);
    if (desert) {
      instances(new T.CylinderGeometry(.35, .45, 1, 8), material(theme.tree), crowns.map(p => [p[0], 2.3, p[2], 2, 4.6, 2]));
      instances(boxGeometry, material(theme.tree), crowns.flatMap(p => [[p[0] + 1, 2.3, p[2], 2, .6, .6], [p[0] + 1.7, 3.1, p[2], .6, 2.1, .6]]));
      instances(new T.IcosahedronGeometry(1, 0), material('#b37349'), crowns.map(p => [p[0] + 4, 1.2, p[2] + 3, 2.6, 2, 2]));
    } else {
      const foliage = material(theme.tree);
      if (night) { foliage.emissive.set('#16494c'); foliage.emissiveIntensity = .6; }
      instances(night ? new T.ConeGeometry(1, 2.5, 7) : new T.IcosahedronGeometry(1, 1), foliage, crowns);
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6, radius = 340 + (i % 3) * 40;
      mesh(new T.IcosahedronGeometry(1, 1), material(i % 2 ? '#74a5a8' : '#88b7ba'), [Math.cos(angle) * radius, 12, Math.sin(angle) * radius], [65 + i * 3, 30 + i * 3, 65]);
    }
    const building = new T.Group(); building.position.set(37, 0, 132); scene.add(building);
    box(white, [0, 3, 0], [18, 6, 9], building); box(blue, [0, 6.3, 0], [20, .6, 11], building);
    for (let i = -2; i <= 2; i++) box(dark, [i * 3.3, 2.5, -4.55], [2.4, 3.5, .1], building);
    let model;
    function setKart(choice) {
      if (model) { scene.remove(model.root); window.MaloPrototype.disposeObject(model.root); }
      model = window.MaloPrototype.createKart(T, choice); scene.add(model.root);
    }
    setKart(choice);
    const coins = [];
    const coinGeometry = new T.CylinderGeometry(.48, .48, .12, 20);
    const coinMaterial = new T.MeshStandardMaterial({ color: '#ffcf41', metalness: .6, roughness: .25, emissive: '#ad6d00', emissiveIntensity: .4 });
    for (let i = 12; i < track.points.length; i += 9) {
      const p = track.points[i], object = new T.Group(); object.position.set(p.x, 1.1, p.z); scene.add(object);
      const disc = mesh(coinGeometry, coinMaterial, [0, 0, 0], [1, 1, 1], object); disc.rotation.x = Math.PI / 2;
      coins.push({ object, x: p.x, z: p.z, lap: -1 });
    }
    let animation = 0;
    const look = new T.Vector3(), destination = new T.Vector3();
    function update(state, dt, menu, snap = false) {
      const { root: kart, body, wheels } = model;
      kart.position.set(state.x, .08, state.z); kart.rotation.y = state.yaw;
      animation += dt;
      coins.forEach(c => { c.object.rotation.y = animation * 2; c.object.position.y = 1.1 + Math.sin(animation * 3 + c.x) * .12; });
      body.rotation.z = Math.sin(state.yaw - Math.atan2(state.vx, state.vz)) * Math.min(state.speed / 60, .15);
      wheels.forEach(w => { w.tire.rotation.x += state.speed * dt / .4; w.rim.rotation.x = w.tire.rotation.x; w.spokes.forEach(s => { s.rotation.x += state.speed * dt / .4; }); w.pivot.rotation.y = w.front ? Math.sin(state.yaw - Math.atan2(state.vx, state.vz)) * .6 : 0; });
      const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw);
      if (menu) {
        destination.set(state.x + fx * 6 + fz * 6, 3.3, state.z + fz * 6 - fx * 6);
        look.set(state.x - fz * 3.2, 1, state.z + fx * 3.2);
      } else {
        destination.set(state.x - fx * (8 + state.speed * .045), 4.6, state.z - fz * (8 + state.speed * .045));
        look.set(state.x + fx * 4, 1, state.z + fz * 4);
      }
      camera.position.lerp(destination, snap ? 1 : 1 - Math.exp(-dt * 8)); camera.lookAt(look);
      camera.fov = menu ? 49 : 55 + state.speed * .18; camera.updateProjectionMatrix();
      sun.position.set(state.x - 45, 70, state.z + 30); sun.target.position.set(state.x, 0, state.z);
      gates.forEach((mat, i) => { mat.emissive.set(i === state.nextGate ? '#1b6756' : '#000000'); });
    }
    return { scene, camera, get kart() { return model.root; }, update, setKart, coins };
  };
})();
