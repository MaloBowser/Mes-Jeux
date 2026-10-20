(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createRaceView = (T, scene, track, race) => {
    const group = new T.Group(); scene.add(group);
    const glow = color => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .65, roughness: .3 });
    const cyan = glow('#57dfff'), pink = glow('#f778db'), orange = glow('#ffb348');
    const sphere = new T.SphereGeometry(1, 12, 8), cone = new T.ConeGeometry(.6, 1.3, 5);
    const shieldMaterial = new T.MeshBasicMaterial({ color: '#67efff', transparent: true, opacity: .2, wireframe: true });
    const rivalModels = race.rivals.map(racer => { const model = api.createKart(T, racer.choice); group.add(model.root); return model; });
    const shields = race.racers.map(() => { const mesh = new T.Mesh(sphere, shieldMaterial); mesh.scale.set(1.9, 1.7, 2.3); group.add(mesh); return mesh; });
    const flames = race.racers.map(() => {
      const mesh = new T.Mesh(cone, orange); mesh.rotation.x = -Math.PI / 2; group.add(mesh); return mesh;
    });
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2879a9'; ctx.fillRect(0, 0, 64, 64); ctx.strokeStyle = '#86ffff'; ctx.lineWidth = 5; ctx.strokeRect(3, 3, 58, 58);
    ctx.font = 'bold 49px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('?', 32, 50);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    const boxMaterial = new T.MeshStandardMaterial({ map, emissive: '#329aaa', emissiveIntensity: .5 });
    const boxGeometry = new T.BoxGeometry(1.35, 1.35, 1.35);
    const boxes = race.boxes.map(box => { const mesh = new T.Mesh(boxGeometry, boxMaterial); mesh.position.set(box.x, 1.25, box.z); group.add(mesh); return mesh; });
    const trapMeshes = [], shotMeshes = [];
    const radar = document.getElementById('radar'), pen = radar.getContext('2d');
    const xs = track.points.map(p => p.x), zs = track.points.map(p => p.z);
    const minX = Math.min(...xs), minZ = Math.min(...zs);
    const scale = 154 / Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ);
    const point = p => [13 + (p.x - minX) * scale, 13 + (p.z - minZ) * scale];
    function drawMap() {
      pen.clearRect(0, 0, 180, 180); pen.beginPath();
      track.points.forEach((p, i) => { const xy = point(p); if (i) pen.lineTo(...xy); else pen.moveTo(...xy); });
      pen.closePath(); pen.lineWidth = 8; pen.strokeStyle = '#829ca066'; pen.stroke();
      pen.lineWidth = 2; pen.strokeStyle = '#e1f8ed88'; pen.stroke();
      const start = point(track.points[0]); pen.fillStyle = '#fff'; pen.fillRect(start[0] - 4, start[1] - 4, 8, 8);
      for (const racer of [...race.rivals, race.player]) {
        const xy = point(racer.state); pen.beginPath(); pen.arc(...xy, racer.id ? 3.5 : 5, 0, Math.PI * 2);
        pen.fillStyle = racer.id ? api.drivers[racer.choice.driver].color : '#ffe06a'; pen.fill();
        if (!racer.id) { pen.lineWidth = 2; pen.strokeStyle = '#fff'; pen.stroke(); }
      }
    }
    function updatePool(entries, pool, geometry, material, height) {
      entries.forEach((entry, i) => {
        if (!pool[i]) { pool[i] = new T.Mesh(geometry, material); group.add(pool[i]); }
        pool[i].visible = true; pool[i].position.set(entry.x, height, entry.z);
        pool[i].rotation.y = race.elapsed * 3;
      });
      for (let i = entries.length; i < pool.length; i++) pool[i].visible = false;
    }
    function update(dt, active) {
      group.visible = active;
      if (!active) return;
      race.rivals.forEach((racer, i) => {
        const model = rivalModels[i], s = racer.state;
        model.root.position.set(s.x, .08, s.z); model.root.rotation.y = s.yaw;
        model.body.rotation.z = s.stun > 0 ? Math.sin(race.elapsed * 35) * .15 : 0;
        model.wheels.forEach(w => { w.tire.rotation.x += s.speed * dt / .4; w.rim.rotation.x = w.tire.rotation.x; });
      });
      race.racers.forEach((racer, i) => {
        const s = racer.state, shield = shields[i], flame = flames[i];
        shield.visible = s.shield > 0; shield.position.set(s.x, 1.2, s.z); shield.rotation.y = s.yaw;
        flame.visible = s.boost > 0 || s.driftCharge >= .8;
        flame.position.set(s.x - Math.sin(s.yaw) * 2.1, .55, s.z - Math.cos(s.yaw) * 2.1);
        flame.rotation.set(-Math.PI / 2, 0, s.yaw); flame.scale.setScalar(.8 + Math.sin(race.elapsed * 45) * .2);
      });
      boxes.forEach((mesh, i) => {
        mesh.visible = race.boxes[i].cooldown === 0;
        mesh.rotation.set(.15, race.elapsed * 1.3, .15); mesh.position.y = 1.25 + Math.sin(race.elapsed * 3 + i) * .15;
      });
      updatePool(race.hazards, trapMeshes, cone, pink, .65);
      updatePool(race.shots, shotMeshes, sphere, cyan, 1);
      shotMeshes.forEach(mesh => mesh.scale.setScalar(.45));
      drawMap();
    }
    return { update };
  };
})();
