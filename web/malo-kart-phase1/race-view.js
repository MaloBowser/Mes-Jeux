(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createRaceView = (T, scene, track, race) => {
    const group = new T.Group(); scene.add(group);
    const glow = color => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .65, roughness: .3 });
    const orange = glow('#ffb348'), gold = glow('#ffe459');
    const cone = new T.ConeGeometry(.6, 1.3, 5);
    const star = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .16 : .36;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i) star.lineTo(x, y); else star.moveTo(x, y);
    }
    star.closePath();
    const starGeometry = new T.ExtrudeGeometry(star, { depth: .08, bevelEnabled: false });
    const rivalModels = race.rivals.map(racer => { const model = api.createKart(T, racer.choice); group.add(model.root); return model; });
    const shields = race.racers.map(() => {
      const aura = new T.Group();
      for (let i = 0; i < 5; i++) {
        const mesh = new T.Mesh(starGeometry, gold), angle = i * Math.PI * 2 / 5;
        mesh.position.set(Math.sin(angle) * 1.8, Math.sin(angle * 2) * .5, Math.cos(angle) * 1.8);
        mesh.rotation.y = angle; aura.add(mesh);
      }
      group.add(aura); return aura;
    });
    const flames = race.racers.map(() => {
      const mesh = new T.Mesh(cone, orange); mesh.rotation.x = -Math.PI / 2; group.add(mesh); return mesh;
    });
    const sparks = new T.InstancedMesh(new T.SphereGeometry(1, 5, 4), new T.MeshBasicMaterial(), race.racers.length * 12);
    sparks.frustumCulled = false; group.add(sparks);
    const sparkPose = new T.Object3D(), sparkColor = new T.Color();
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
    function createBanana() {
      const model = new T.Group();
      const peel = new T.Shape();
      peel.moveTo(0, 1.05); peel.quadraticCurveTo(.2, .2, .95, .08);
      peel.lineTo(.7, .02); peel.quadraticCurveTo(.05, -.06, -.12, .7); peel.closePath();
      const geometry = new T.ExtrudeGeometry(peel, { depth: .12, bevelEnabled: false });
      for (let i = 0; i < 3; i++) {
        const mesh = new T.Mesh(geometry, gold); mesh.rotation.y = i * Math.PI * 2 / 3; model.add(mesh);
      }
      const stem = new T.Mesh(new T.CylinderGeometry(.07, .1, .25, 5), new T.MeshStandardMaterial({ color: '#83a639' }));
      stem.position.y = 1.1; model.add(stem); return model;
    }
    function createShell() {
      const model = new T.Group();
      const dome = new T.Mesh(new T.SphereGeometry(.65, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glow('#e63d34'));
      dome.scale.y = .85; model.add(dome);
      const rim = new T.Mesh(new T.TorusGeometry(.59, .13, 6, 16), new T.MeshStandardMaterial({ color: '#fff2cf' }));
      rim.rotation.x = Math.PI / 2; model.add(rim);
      const panels = new T.IcosahedronGeometry(.64, 0);
      const seams = new T.LineSegments(new T.WireframeGeometry(panels), new T.LineBasicMaterial({ color: '#7a292b' }));
      panels.dispose();
      seams.scale.y = .48; seams.position.y = .22; model.add(seams); return model;
    }
    function updatePool(entries, pool, createModel, height) {
      entries.forEach((entry, i) => {
        if (!pool[i]) { pool[i] = createModel(); group.add(pool[i]); }
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
        model.root.position.set(s.x, .08 + s.y, s.z); model.root.rotation.set(s.y > 0 ? -.12 : 0,s.yaw,0);
        model.glider.scale.setScalar(s.y > 0 ? 1 : .15); model.glider.position.set(0,s.y > 0 ? 3.1 : 1.15,s.y > 0 ? -.35 : -.9);
        model.body.rotation.z = s.stun > 0 ? Math.sin(race.elapsed * 35) * .15 : 0;
        model.wheels.forEach(w => { w.tire.rotation.x += s.speed * dt / .4; w.rim.rotation.x = w.tire.rotation.x; });
      });
      race.racers.forEach((racer, i) => {
        const s = racer.state, shield = shields[i], flame = flames[i];
        shield.visible = s.shield > 0; shield.position.set(s.x, 1.2 + s.y, s.z); shield.rotation.y = race.elapsed * 4;
        flame.visible = s.boost > 0;
        flame.position.set(s.x - Math.sin(s.yaw) * 2.1, .55 + s.y, s.z - Math.cos(s.yaw) * 2.1);
        flame.rotation.set(-Math.PI / 2, 0, s.yaw); flame.scale.setScalar(.8 + Math.sin(race.elapsed * 45) * .2);
        for (let j = 0; j < 12; j++) {
          const age = (race.elapsed * 4 + j / 12) % 1, side = j % 2 ? 1 : -1, index = i * 12 + j;
          sparkPose.position.set(s.x + Math.cos(s.yaw) * side * (1 + age * .6) - Math.sin(s.yaw) * (1 + age * 2), .18 + Math.sin(age * Math.PI) * .45, s.z - Math.sin(s.yaw) * side * (1 + age * .6) - Math.cos(s.yaw) * (1 + age * 2));
          sparkPose.scale.setScalar(s.drift && s.driftCharge >= .8 ? .12 * (1 - age) : 0);
          sparkPose.updateMatrix(); sparks.setMatrixAt(index, sparkPose.matrix);
          sparks.setColorAt(index, sparkColor.set(s.driftCharge >= 1.6 ? '#ffb22e' : '#55dbff'));
        }
      });
      sparks.instanceMatrix.needsUpdate = true; sparks.instanceColor.needsUpdate = true;
      boxes.forEach((mesh, i) => {
        mesh.visible = race.boxes[i].cooldown === 0;
        mesh.rotation.set(.15, race.elapsed * 1.3, .15); mesh.position.y = 1.25 + Math.sin(race.elapsed * 3 + i) * .15;
      });
      updatePool(race.hazards, trapMeshes, createBanana, .1);
      updatePool(race.shots, shotMeshes, createShell, .35);
      drawMap();
    }
    return { update };
  };
})();
