/* Malo Kart — circuit, modèles et sons procéduraux. Moteur : Three.js (MIT). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fail = message => { $('error-detail').textContent = message; $('error').hidden = false; };
  if (!window.THREE) { fail('Le fichier du moteur 3D est introuvable. Conserve le dossier vendor avec le jeu.'); return; }
  const T = THREE;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' }); }
  catch (_) { fail('WebGL est indisponible. Essaie Edge, Chrome ou Firefox avec l’accélération graphique activée.'); return; }
  const pixelRatioLimit = matchMedia('(pointer: coarse)').matches ? 1.25 : 1.6;
  renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioLimit));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new T.Scene();
  scene.background = new T.Color('#a8d5df');
  scene.fog = new T.FogExp2('#b9d3d6', .00165);
  const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, .15, 2300);
  const sun = new T.DirectionalLight('#fff1cf', 3.4);
  sun.position.set(-170, 250, 120);
  sun.castShadow = true;
  const shadowResolution = pixelRatioLimit < 1.6 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowResolution, shadowResolution);
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 600 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .035;
  scene.add(sun, sun.target, new T.HemisphereLight('#c1e7ff', '#64714a', 2.0));

  const clamp = T.MathUtils.clamp;
  const lerp = T.MathUtils.lerp;
  const mod = (n, m) => (n % m + m) % m;
  const angleDiff = (a, b) => mod(a - b + Math.PI, Math.PI * 2) - Math.PI;
  const v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const materials = { black: mat('#141a1b'), rubber: mat('#141717', .98), metal: mat('#a9b7b9', .28, .8), white: mat('#f7f0db'), sand: mat('#c9b895'), trunk: mat('#7f7054'), leaves: mat('#667f42'), darkLeaves: mat('#3d694e') };
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const sphereGeo = new T.SphereGeometry(1, 16, 12);
  const cylinderGeo = new T.CylinderGeometry(1, 1, 1, 12);
  function mesh(geometry, material, position, scale, parent = scene) {
    const object = new T.Mesh(geometry, material);
    object.position.set(...position);
    if (scale) object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (material, position, scale, parent) => mesh(boxGeo, material, position, scale, parent);
  function canvasTexture(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const asphalt = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#53585a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 24000; i++) {
      const tone = 45 + random() * 75;
      ctx.fillStyle = `rgba(${tone},${tone},${tone},.24)`;
      ctx.fillRect(random() * w, random() * h, 1.5, 1.5);
    }
    ctx.fillStyle = '#eee9d3'; ctx.fillRect(5, 0, 3, h); ctx.fillRect(w - 8, 0, 3, h);
    ctx.fillStyle = '#ddd9c370'; ctx.fillRect(w / 2 - 1, 20, 2, 90);
    ctx.fillStyle = '#171d2020'; ctx.fillRect(58, 0, 9, h); ctx.fillRect(182, 0, 9, h);
  });
  asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping;
  const groundTexture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#89906a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = random() > .45 ? '#ccc78e28' : '#32492438';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 4, 1 + random() * 4);
    }
  });
  groundTexture.wrapS = groundTexture.wrapT = T.RepeatWrapping;
  groundTexture.repeat.set(50, 50);

  const curve = new T.CatmullRomCurve3([
    [-90, 2, 170], [35, 2, 177], [142, 3, 140], [181, 7, 45], [112, 11, -27],
    [157, 15, -119], [67, 12, -179], [-51, 7, -156], [-85, 4, -66], [-173, 3, -21], [-180, 2, 85]
  ].map(p => v3(...p)), true, 'catmullrom', .45);
  curve.arcLengthDivisions = 2400;
  const LENGTH = curve.getLength();
  const SAMPLES = 1000;
  const track = Array.from({ length: SAMPLES }, (_, i) => {
    const t = i / SAMPLES;
    const p = curve.getPointAt(t), tangent = curve.getTangentAt(t).normalize();
    return { p, tangent, right: v3(tangent.z, 0, -tangent.x).normalize(), yaw: Math.atan2(tangent.x, tangent.z) };
  });
  function sample(distance) {
    const n = mod(distance, LENGTH) / LENGTH * SAMPLES;
    const a = track[Math.floor(n)], b = track[(Math.floor(n) + 1) % SAMPLES], f = n % 1;
    return { p: a.p.clone().lerp(b.p, f), right: a.right.clone().lerp(b.right, f).normalize(), yaw: a.yaw + angleDiff(b.yaw, a.yaw) * f, tangent: a.tangent.clone().lerp(b.tangent, f).normalize() };
  }
  function trackPosition(distance, lateral = 0, height = 0) {
    const s = sample(distance);
    return s.p.addScaledVector(s.right, lateral).add(v3(0, height, 0));
  }
  function ribbon(inner, outer, material, height = 0, curb = false) {
    const points = [], uv = [], colors = [], indices = [];
    const white = new T.Color('#e9dfc9'), red = new T.Color('#dc563b');
    for (let i = 0; i <= SAMPLES; i++) {
      const s = track[i % SAMPLES];
      for (const edge of [inner, outer]) {
        const p = s.p.clone().addScaledVector(s.right, edge);
        points.push(p.x, p.y + height, p.z);
        uv.push(edge === inner ? 0 : 1, i * LENGTH / SAMPLES / 14);
        const color = Math.floor(i / 4) % 2 ? white : red;
        colors.push(color.r, color.g, color.b);
      }
      if (i < SAMPLES) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    if (curb) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const road = mesh(geometry, material, [0, 0, 0]);
    road.castShadow = false;
    return road;
  }
  ribbon(-14, 14, mat('#b5ab8d'), -.07);
  ribbon(-8.5, 8.5, new T.MeshStandardMaterial({ map: asphalt, roughness: .94 }));
  const curbMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
  ribbon(-9.4, -8.5, curbMaterial, .06, true);
  ribbon(8.5, 9.4, curbMaterial, .06, true);

  function buildLandscape() {
    const islandGeo = new T.PlaneGeometry(660, 600, 100, 100);
    islandGeo.rotateX(-Math.PI / 2);
    const positions = islandGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      let nearest = Infinity, roadY = 2;
      for (let j = 0; j < SAMPLES; j += 5) {
        const s = track[j], d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2;
        if (d < nearest) { nearest = d; roadY = s.p.y; }
      }
      const distance = Math.sqrt(nearest);
      const mound = 7 + 14 * Math.sin(x * .012) * Math.cos(z * .016) + 3 * Math.sin(z * .047 + x * .018);
      let y = lerp(roadY - .23, mound, clamp((distance - 18) / 40, 0, 1));
      const edge = Math.max(Math.abs(x) / 305, Math.abs(z) / 275);
      y = lerp(y, -8, clamp((edge - .77) / .23, 0, 1));
      positions.setY(i, y);
    }
    islandGeo.computeVertexNormals();
    const ground = mesh(islandGeo, new T.MeshStandardMaterial({ map: groundTexture, roughness: 1 }), [0, 0, 0]);
    ground.castShadow = false;
    const sea = mesh(new T.PlaneGeometry(6000, 6000), new T.MeshStandardMaterial({ color: '#319ba8', roughness: .25, metalness: .4 }), [0, -5, 0]);
    sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
    const waterTexture = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#7f7fff'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 800; i++) { ctx.fillStyle = `rgba(140,170,255,${random() * .35})`; ctx.fillRect(random() * w, random() * h, random() * 60 + 10, 1); }
    });
    waterTexture.colorSpace = T.NoColorSpace;
    waterTexture.wrapS = waterTexture.wrapT = T.RepeatWrapping;
    waterTexture.repeat.set(150, 150);
    sea.material.normalMap = waterTexture; sea.material.normalScale.set(.4, .4);

    const skyGeo = new T.SphereGeometry(1800, 32, 20);
    const skyMaterial = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { top: { value: new T.Color('#6dabc9') }, bottom: { value: new T.Color('#f6e2c0') } }, vertexShader: 'varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 bottom; void main(){float h=clamp(normalize(vPos).y*1.5,0.,1.); gl_FragColor=vec4(mix(bottom,top,pow(h,.6)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
    const sky = mesh(skyGeo, skyMaterial, [0, 0, 0]); sky.castShadow = false;
    const sunDisc = mesh(sphereGeo, new T.MeshBasicMaterial({ color: '#fff3c9', fog: false }), [-900, 460, 620], [35, 35, 35]); sunDisc.castShadow = false;
    const environment = new T.Scene(); environment.add(sky.clone(), sunDisc.clone());
    const generator = new T.PMREMGenerator(renderer);
    scene.environment = generator.fromScene(environment, .04, .1, 2300).texture;
    generator.dispose();
    const mountainMaterial = mat('#8b9f97');
    const mountainGeo = new T.SphereGeometry(1, 32, 16);
    const mountainVertices = mountainGeo.attributes.position;
    for (let i = 0; i < mountainVertices.count; i++) {
      const x = mountainVertices.getX(i), y = mountainVertices.getY(i), z = mountainVertices.getZ(i);
      mountainVertices.setY(i, y * (.78 + Math.sin(x * 13 + z * 6) * .12 + Math.cos(z * 15) * .1));
    }
    mountainGeo.computeVertexNormals();
    for (let i = 0; i < 21; i++) {
      const a = i / 21 * Math.PI * 2;
      const mountain = mesh(mountainGeo, mountainMaterial, [Math.sin(a) * 1000, -35, Math.cos(a) * 1000], [160 + random() * 170, 80 + random() * 150, 130 + random() * 120]);
      mountain.rotation.y = random() * 6; mountain.castShadow = false;
    }
    return waterTexture;
  }
  const waterTexture = buildLandscape();

  function instances(geometry, material, transforms, castShadow = true) {
    const object = new T.InstancedMesh(geometry, material, transforms.length);
    const dummy = new T.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.copy(t.p); dummy.rotation.set(0, t.yaw || 0, t.tilt || 0); dummy.scale.set(...t.scale); dummy.updateMatrix(); object.setMatrixAt(i, dummy.matrix);
    });
    object.castShadow = castShadow; object.receiveShadow = true; scene.add(object); return object;
  }
  function buildDecor() {
    const posts = [], rails = [], trunks = [], crowns = [], rocks = [];
    for (let i = 0; i < SAMPLES; i += 5) {
      for (const side of [-1, 1]) {
        const s = track[i];
        posts.push({ p: s.p.clone().addScaledVector(s.right, side * 12.5).add(v3(0, .55, 0)), yaw: s.yaw, scale: [.17, 1.1, .2] });
        rails.push({ p: s.p.clone().addScaledVector(s.right, side * 12.5).add(v3(0, .8, 0)), yaw: s.yaw, scale: [.2, .42, LENGTH / SAMPLES * 5 + .2] });
      }
    }
    instances(boxGeo, materials.metal, posts);
    instances(boxGeo, mat('#d1d4c4', .4, .45), rails);
    for (let i = 0; i < 230; i++) {
      const d = random() * LENGTH, side = random() > .5 ? 1 : -1;
      const s = sample(d), p = s.p.clone().addScaledVector(s.right, side * (18 + random() * 12));
      let nearby = false;
      for (let j = 0; j < SAMPLES; j += 8) if (Math.hypot(track[j].p.x - p.x, track[j].p.z - p.z) < 16) nearby = true;
      if (nearby || (d < 90 && side === 1)) continue;
      const height = 4 + random() * 5;
      trunks.push({ p: p.clone().add(v3(0, height * .35, 0)), scale: [.25, height * .7, .25] });
      for (let branch = 0; branch < 3; branch++) {
        const angle = branch / 3 * Math.PI * 2;
        crowns.push({ p: p.clone().add(v3(Math.cos(angle) * 1.25, height * .72 + random(), Math.sin(angle) * 1.25)), scale: [2 + random(), height * .2, 2 + random()], yaw: random() * 6 });
      }
    }
    instances(cylinderGeo, materials.trunk, trunks);
    instances(new T.IcosahedronGeometry(1, 2), materials.darkLeaves, crowns);
    for (let i = 0; i < 110; i++) {
      const s = sample(random() * LENGTH), p = s.p.clone().addScaledVector(s.right, (random() > .5 ? 1 : -1) * (16 + random() * 7));
      rocks.push({ p: p.add(v3(0, -.3, 0)), yaw: random() * 6, scale: [1 + random() * 2, .6 + random(), 1 + random() * 2] });
    }
    instances(new T.DodecahedronGeometry(1, 0), mat('#a99f88'), rocks);

    const start = sample(0), gate = new T.Group();
    gate.position.copy(start.p); gate.rotation.y = start.yaw; scene.add(gate);
    box(materials.black, [-11, 4.2, 0], [.6, 8.4, .65], gate);
    box(materials.black, [11, 4.2, 0], [.6, 8.4, .65], gate);
    box(mat('#ff653c'), [0, 7.7, 0], [23, 2.2, .8], gate);
    const bannerTexture = canvasTexture(1024, 128, (ctx, w, h) => {
      ctx.fillStyle = '#162830'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f8f2df'; ctx.font = 'italic 900 69px Arial'; ctx.textAlign = 'center'; ctx.fillText('MALO KART  /  RIVIERA GP', w / 2, 90);
      ctx.fillStyle = '#ff653c'; ctx.fillRect(0, 0, 14, h); ctx.fillRect(w - 14, 0, 14, h);
    });
    for (const z of [-.42, .42]) {
      const banner = mesh(new T.PlaneGeometry(22.7, 2.05), new T.MeshStandardMaterial({ map: bannerTexture, side: T.DoubleSide }), [0, 7.7, z], null, gate);
      if (z < 0) banner.rotation.y = Math.PI;
    }
    const checkers = canvasTexture(256, 64, (ctx, w, h) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) { ctx.fillStyle = (x + y) % 2 ? '#192327' : '#f3ead5'; ctx.fillRect(x * 16, y * 32, 16, 32); }
    });
    const line = mesh(new T.PlaneGeometry(17, 2.5), new T.MeshStandardMaterial({ map: checkers }), [0, .08, 0], null, gate);
    line.rotation.x = -Math.PI / 2; line.castShadow = false;
    for (let i = 0; i < 8; i++) {
      const grid = mesh(new T.PlaneGeometry(2.6, .12), materials.white, [i % 2 ? 3 : -3, .05, -5 - Math.floor(i / 2) * 5], null, gate);
      grid.rotation.x = -Math.PI / 2; grid.castShadow = false;
    }
    const stand = new T.Group(); stand.position.copy(trackPosition(40, 25)); stand.rotation.y = sample(40).yaw; scene.add(stand);
    box(mat('#eee6d1'), [0, 2, 0], [11, 4, 50], stand);
    box(mat('#20353f'), [0, 5.3, 0], [13, .3, 54], stand);
    for (let i = -3; i <= 3; i++) {
      box(materials.metal, [-5, 4, i * 7], [.18, 3, .18], stand);
      box(mat('#9bbfc2', .15, .4), [-5.55, 2.7, i * 7], [.03, 1.4, 5.8], stand);
      box(mat(i % 2 ? '#e76344' : '#eacb6b'), [-5.6, .8, i * 7], [.1, 1, 5.8], stand);
    }
    const spectatorTransforms = [];
    for (let i = 0; i < 100; i++) spectatorTransforms.push({ p: trackPosition(20 + random() * 60, -19 - random() * 5, .5 + random()), scale: [.32, .7 + random() * .4, .32] });
    instances(cylinderGeo, mat('#c57955'), spectatorTransforms);
    for (let i = 0; i < 8; i++) {
      const s = sample(LENGTH * (i + .25) / 8), p = s.p.clone().addScaledVector(s.right, -16);
      const sign = new T.Group(); sign.position.copy(p); sign.rotation.y = s.yaw; scene.add(sign);
      box(materials.metal, [0, 1.4, 0], [.15, 2.8, .15], sign);
      const tex = canvasTexture(256, 128, (ctx, w, h) => { ctx.fillStyle = '#182a31'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffb35d'; ctx.font = 'bold 95px Arial'; ctx.textAlign = 'center'; ctx.fillText('› › ›', 128, 96); });
      mesh(new T.PlaneGeometry(4, 2), new T.MeshStandardMaterial({ map: tex, side: T.DoubleSide }), [0, 3, 0], null, sign);
    }
  }
  buildDecor();

  function createKart(color, number) {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const paint = mat(color, .28, .35);
    box(materials.black, [0, .46, 0], [1.55, .23, 2.45], body);
    box(paint, [0, .69, .77], [1.02, .38, 1.13], body);
    const nose = mesh(sphereGeo, paint, [0, .71, 1.18], [.57, .23, .55], body);
    box(paint, [-.86, .61, -.12], [.33, .4, 1.45], body);
    box(paint, [.86, .61, -.12], [.33, .4, 1.45], body);
    box(materials.black, [0, .41, 1.59], [1.8, .15, .15], body);
    box(materials.metal, [0, .54, -.89], [1.95, .12, .16], body);
    box(materials.black, [0, .92, -.48], [.73, .8, .22], body).rotation.x = -.13;
    box(paint, [0, 1.09, -1.17], [1.8, .12, .45], body);
    for (const x of [-.56, .56]) box(materials.black, [x, .77, -1.17], [.09, .58, .1], body);
    box(materials.metal, [.54, .73, -.68], [.4, .36, .57], body);
    const exhaust = mesh(cylinderGeo, materials.metal, [.67, .54, -1.35], [.1, .56, .1], body); exhaust.rotation.x = Math.PI / 2;
    const wheels = [];
    const tireGeo = new T.CylinderGeometry(.38, .38, .34, 20);
    const hubGeo = new T.CylinderGeometry(.2, .2, .355, 12);
    for (const x of [-1, 1]) for (const z of [-.83, .93]) {
      const pivot = new T.Group(); pivot.position.set(x, .39, z); root.add(pivot);
      const tire = mesh(tireGeo, materials.rubber, [0, 0, 0], null, pivot); tire.rotation.z = Math.PI / 2;
      const hub = mesh(hubGeo, materials.metal, [0, 0, 0], null, pivot); hub.rotation.z = Math.PI / 2;
      wheels.push({ pivot, tire, hub, front: z > 0 });
    }
    const suit = mat(color, .85);
    mesh(sphereGeo, suit, [0, 1.12, -.18], [.37, .46, .3], body);
    const helmet = mesh(sphereGeo, materials.white, [0, 1.76, -.12], [.39, .4, .39], body);
    mesh(sphereGeo, mat('#142e3b', .13, .55), [0, 1.78, .135], [.34, .19, .19], body);
    mesh(sphereGeo, paint, [0, 2.065, -.14], [.21, .095, .31], body);
    for (const x of [-1, 1]) {
      const arm = mesh(cylinderGeo, suit, [x * .34, 1.17, .2], [.13, .55, .13], body); arm.rotation.x = -.8; arm.rotation.z = x * .25;
      mesh(sphereGeo, materials.black, [x * .32, 1.02, .44], [.13, .13, .13], body);
    }
    const steering = mesh(new T.TorusGeometry(.27, .045, 6, 16), materials.black, [0, 1.02, .47], null, body); steering.rotation.x = -.6;
    const badge = canvasTexture(64, 64, (ctx, w, h) => { ctx.fillStyle = '#f4eedc'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#182b33'; ctx.font = 'bold 46px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(number), w / 2, 49); });
    const plate = mesh(new T.PlaneGeometry(.45, .45), new T.MeshStandardMaterial({ map: badge }), [0, .925, .87], null, body); plate.rotation.x = -Math.PI / 2;
    const glowMaterial = new T.MeshBasicMaterial({ color: '#70daff', transparent: true, opacity: .85, depthWrite: false });
    const flames = [];
    for (const x of [-.5, .5]) { const flame = mesh(new T.ConeGeometry(.18, 1, 8), glowMaterial, [x, .43, -1.8], null, root); flame.rotation.x = -Math.PI / 2; flame.visible = false; flames.push(flame); }
    const shield = mesh(new T.SphereGeometry(1, 20, 12), new T.MeshBasicMaterial({ color: '#78e4ff', transparent: true, opacity: .16, wireframe: true, depthWrite: false }), [0, 1, 0], [1.65, 1.55, 2], root);
    shield.visible = false; shield.castShadow = false;
    scene.add(root);
    return { root, body, paint, suit, wheels, flames, shield, helmet, nose };
  }
  const names = ['TOI', 'LÉO', 'NOVA', 'JADE', 'MAX', 'LUNA', 'AXEL', 'ROSE'];
  const kartColors = [0xff5032, 0x3dbbff, 0xffd04e, 0x65cd94, 0xa682fc, 0xf0f0d9, 0xff914f, 0xf476aa];
  const racers = names.map((name, i) => ({ name, index: i, model: createKart(kartColors[i], i + 1), progress: 0, lane: 0, speed: 0, heading: 0, lateralSpeed: 0, boost: 0, shield: 0, stun: 0, collision: 0, item: null, finish: null, aiTimer: 7 + i }));
  const player = racers[0];
  const ITEM_TYPES = {
    turbo: { name: 'TURBO', icon: 'ϟ', hint: '3 secondes à fond' },
    shield: { name: 'BOUCLIER', icon: '◈', hint: '8 secondes protégé' },
    missile: { name: 'MISSILE', icon: '➤', hint: 'Vise le kart devant toi' },
    mine: { name: 'MINE', icon: '✹', hint: 'Un piège derrière toi' }
  };
  const pickups = [], pads = [], hazards = [], projectiles = [];
  const pickupMaterial = new T.MeshStandardMaterial({ color: '#70deff', emissive: '#28a9d0', emissiveIntensity: .6, metalness: .5, roughness: .18, transparent: true, opacity: .8 });
  const pickupGeo = new T.BoxGeometry(1.5, 1.5, 1.5);
  const questionTexture = canvasTexture(64, 64, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 56px Arial'; ctx.textAlign = 'center'; ctx.fillText('?', w / 2, 53); });
  for (const fraction of [.12, .35, .60, .85]) for (const lane of [-5.5, 0, 5.5]) {
    const object = mesh(pickupGeo, pickupMaterial, [0, 0, 0]);
    object.position.copy(trackPosition(fraction * LENGTH, lane, 1.8));
    const label = new T.Sprite(new T.SpriteMaterial({ map: questionTexture, transparent: true, depthWrite: false })); label.scale.set(1.15, 1.15, 1); object.add(label);
    pickups.push({ object, progress: fraction * LENGTH, lane, cooldown: 0 });
  }
  const padTexture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ef762e'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#fff0a5'; ctx.lineWidth = 9;
    for (let y = -40; y < h; y += 45) { ctx.beginPath(); ctx.moveTo(10, y + 35); ctx.lineTo(64, y); ctx.lineTo(118, y + 35); ctx.stroke(); }
  });
  for (const [fraction, lane] of [[.24, -4.8], [.49, 4.8], [.76, 0]]) {
    const s = sample(fraction * LENGTH), object = mesh(new T.PlaneGeometry(4.1, 6.5), new T.MeshStandardMaterial({ map: padTexture, emissive: '#d97820', emissiveIntensity: .28 }), [0, 0, 0]);
    object.position.copy(trackPosition(fraction * LENGTH, lane, .09)); object.rotation.set(-Math.PI / 2, 0, -s.yaw); object.castShadow = false;
    pads.push({ progress: fraction * LENGTH, lane });
  }
  const sparkCount = 180, sparkData = Array.from({ length: sparkCount }, () => ({ life: 0, position: v3(), velocity: v3() }));
  const sparkPositions = new Float32Array(sparkCount * 3).fill(0), sparkColors = new Float32Array(sparkCount * 3);
  const sparkGeometry = new T.BufferGeometry();
  sparkGeometry.setAttribute('position', new T.BufferAttribute(sparkPositions, 3)); sparkGeometry.setAttribute('color', new T.BufferAttribute(sparkColors, 3));
  const sparks = new T.Points(sparkGeometry, new T.PointsMaterial({ size: .2, vertexColors: true, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false; scene.add(sparks);
  let sparkIndex = 0;
  function emitSparks(position, color, count = 3) {
    const c = new T.Color(color);
    for (let i = 0; i < count; i++) {
      const index = sparkIndex++ % sparkCount, p = sparkData[index];
      p.position.copy(position); p.velocity.set((Math.random() - .5) * 8, Math.random() * 4, (Math.random() - .5) * 8); p.life = .3 + Math.random() * .3;
      sparkColors.set([c.r, c.g, c.b], index * 3);
    }
    sparkGeometry.attributes.color.needsUpdate = true;
  }
  let mode = 'menu', pausedMode = 'race', countdown = 3.5, elapsed = 0, lapStart = 0, lastLap = 0, bestLap = Infinity;
  let driftCharge = 0, drifting = false, cameraMode = 0, toastTimer = 0, uiTimer = 0, animTime = 0, lastFrame = 0;
  let record = null, soundOn = false, audio = null, engine = null, engineGain = null;
  let recordKey = 'malo-kart-record-v1';
  try {
    const profileId = localStorage.getItem('malo.activeProfile');
    if (profileId) recordKey = `malo.profileData.${profileId}.${recordKey}`;
  } catch (_) { /* Le jeu reste jouable sans stockage. */ }
  const keys = { gas: false, brake: false, left: false, right: false, drift: false };
  const heldKeys = new Set(), touchKeys = new Map();
  const keyMap = { ArrowUp: 'gas', KeyW: 'gas', KeyZ: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'drift', ShiftRight: 'drift', Space: 'drift' };
  let touch = matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', touch);
  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const ms = Math.floor(Math.max(0, seconds) * 1000);
    return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
  }
  function readRecord() {
    try { const saved = JSON.parse(localStorage.getItem(recordKey)); if (saved && Number.isFinite(saved.race) && saved.race > 0 && Number.isFinite(saved.lap) && saved.lap > 0) record = saved; } catch (_) { /* Le jeu reste jouable sans stockage. */ }
    $('record').textContent = record ? `TON RECORD · ${formatTime(record.race)}  /  TOUR · ${formatTime(record.lap)}` : 'RIVIERA GP · TON PREMIER DÉPART T’ATTEND';
  }
  readRecord();
  function clearKeys() {
    heldKeys.clear(); touchKeys.clear(); Object.keys(keys).forEach(key => { keys[key] = false; });
    document.querySelectorAll('[data-key]').forEach(button => button.classList.remove('active'));
  }
  function updateKeys() {
    Object.keys(keys).forEach(key => { keys[key] = [...heldKeys].some(code => keyMap[code] === key) || [...touchKeys.values()].includes(key); });
  }
  function toast(message, duration = 2) { $('toast').textContent = message; $('toast').hidden = false; toastTimer = duration; }
  function initAudio() {
    if (audio) { audio.resume().catch(() => {}); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      audio = new AudioContext(); engine = audio.createOscillator(); engineGain = audio.createGain();
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 430;
      engine.type = 'sawtooth'; engine.frequency.value = 40; engineGain.gain.value = 0;
      engine.connect(filter); filter.connect(engineGain); engineGain.connect(audio.destination); engine.start();
    } catch (_) { audio = null; }
  }
  function beep(frequency, duration = .12, volume = .08) {
    if (!soundOn || !audio) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(frequency * .65, now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function updateItem() {
    const item = ITEM_TYPES[player.item];
    $('item-icon').textContent = item ? item.icon : '?'; $('item-name').textContent = item ? item.name : 'AUCUN OBJET';
    $('item-hint').textContent = item ? item.hint : 'Attrape une caisse'; $('item').disabled = !item;
    $('item').setAttribute('aria-label', item ? `Utiliser : ${item.name}` : 'Aucun objet');
  }
  function resetRace() {
    elapsed = 0; lapStart = 0; lastLap = 0; bestLap = Infinity; driftCharge = 0; drifting = false;
    clearKeys();
    racers.forEach((r, i) => {
      Object.assign(r, { progress: -5 - (7 - i) * 2.5, lane: i % 2 ? -3 : 3, speed: 0, heading: 0, lateralSpeed: 0, boost: 0, shield: 0, stun: 0, collision: 0, item: null, finish: null, aiTimer: 7 + i, padCooldown: 0 });
      updateKart(r, 0);
    });
    pickups.forEach(p => { p.cooldown = 0; p.object.visible = true; });
    hazards.forEach(h => scene.remove(h.object)); hazards.length = 0;
    projectiles.forEach(p => scene.remove(p.object)); projectiles.length = 0;
    sparkData.forEach(p => { p.life = 0; });
    updateItem(); updateHUD();
  }
  function startRace() {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    resetRace(); mode = 'countdown'; countdown = 3.5;
    $('menu').hidden = true; $('hud').hidden = false; $('pause').hidden = false; $('touch-controls').hidden = !touch;
    $('toast').hidden = true; $('countdown').hidden = false; $('countdown').textContent = '3';
    initAudio(); updateCamera(1, true); beep(450);
  }
  function pauseRace() {
    if (mode !== 'race' && mode !== 'countdown') return;
    pausedMode = mode; mode = 'paused'; clearKeys(); $('pause-dialog').showModal();
  }
  function resumeRace() { $('pause-dialog').close(); clearKeys(); mode = pausedMode; lastFrame = performance.now(); }
  function showMenu() {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    mode = 'menu'; resetRace(); $('menu').hidden = false; $('hud').hidden = true; $('pause').hidden = true; $('countdown').hidden = true; $('toast').hidden = true; $('touch-controls').hidden = true; readRecord();
  }
  const ordering = () => [...racers].sort((a, b) => a.finish !== null && b.finish !== null ? a.finish - b.finish : a.finish !== null ? -1 : b.finish !== null ? 1 : b.progress - a.progress);
  function finishRace() {
    player.finish = elapsed; mode = 'finished'; clearKeys(); $('touch-controls').hidden = true; $('pause').hidden = true; $('countdown').hidden = true;
    const order = ordering(), rank = order.indexOf(player) + 1;
    $('result-title').textContent = rank === 1 ? 'LA VICTOIRE !' : rank <= 3 ? 'SUR LE PODIUM !' : 'BIEN JOUÉ !';
    $('result-time').textContent = `${rank}${rank === 1 ? 'er' : 'e'} sur 8 · ${formatTime(elapsed)} · Meilleur tour ${formatTime(bestLap)}`;
    $('standings').replaceChildren();
    order.forEach(r => {
      const li = document.createElement('li'), name = document.createElement('b'), time = document.createElement('span');
      li.classList.toggle('you', r === player); name.textContent = r.name;
      time.textContent = r.finish !== null ? formatTime(r.finish) : `à ${Math.max(1, Math.round(player.progress - r.progress))} m`;
      li.append(name, time); $('standings').append(li);
    });
    const isRecord = !record || elapsed < record.race;
    record = { race: Math.min(record?.race ?? Infinity, elapsed), lap: Math.min(record?.lap ?? Infinity, bestLap) };
    let saved = true;
    try { localStorage.setItem(recordKey, JSON.stringify(record)); } catch (_) { saved = false; }
    $('result-record').textContent = (isRecord ? 'Nouveau record personnel ! ' : 'Encore un départ pour battre ton record ? ') + (saved ? 'Ton record est sauvegardé sur cet appareil.' : 'Le stockage est indisponible : le record reste valable pour cette session.');
    $('results-dialog').showModal(); beep(rank === 1 ? 1000 : 650, .5);
  }
  function hit(racer, message) {
    if (racer.shield > 0) { racer.shield = 0; if (racer === player) toast('BOUCLIER · Impact absorbé'); return; }
    racer.stun = 1.2; racer.speed *= .48; racer.boost = 0;
    emitSparks(racer.model.root.position.clone().add(v3(0, 1, 0)), '#ffca62', 28);
    if (racer === player) { toast(message); beep(100, .25); driftCharge = 0; }
  }
  const missileGeo = new T.SphereGeometry(.34, 12, 8), missileMaterial = mat('#ff7642', .2, .4);
  const mineGeo = new T.ConeGeometry(.65, .65, 5), mineMaterial = mat('#f6bf37', .4, .2);
  function useItem(racer) {
    if (mode !== 'race' || !racer.item || racer.finish !== null) return;
    const item = racer.item; racer.item = null;
    if (item === 'turbo') { racer.boost = 3; if (racer === player) toast('TURBO · À FOND !'); }
    if (item === 'shield') { racer.shield = 8; if (racer === player) toast('BOUCLIER · 8 secondes de protection'); }
    if (item === 'mine') {
      const progress = racer.progress - 4, object = mesh(mineGeo, mineMaterial, [0, 0, 0]); object.position.copy(trackPosition(progress, racer.lane, .38));
      hazards.push({ object, progress: mod(progress, LENGTH), lane: racer.lane, owner: racer, life: 24, age: 0 });
      if (racer === player) toast('MINE POSÉE · Attention derrière !');
    }
    if (item === 'missile') {
      const target = racers.filter(r => r !== racer && r.finish === null && r.progress > racer.progress && r.progress - racer.progress < 210).sort((a, b) => a.progress - b.progress)[0];
      if (target) {
        const object = mesh(missileGeo, missileMaterial, [0, 0, 0]);
        projectiles.push({ object, target, owner: racer, progress: racer.progress + 2, lane: racer.lane, life: 6 });
        if (racer === player) toast(`MISSILE · ${target.name} en ligne de mire`);
      } else if (racer === player) toast('MISSILE · Aucune cible à portée');
    }
    if (racer === player) { updateItem(); beep(700, .16); }
  }
  function randomItem(racer) {
    const rank = ordering().indexOf(racer);
    const pool = rank < 2 ? ['shield', 'mine', 'turbo'] : ['turbo', 'turbo', 'shield', 'missile', 'mine'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function updatePlayer(dt) {
    const steering = Number(keys.right) - Number(keys.left);
    const s = sample(player.progress), ahead = sample(player.progress + Math.cos(player.heading) * player.speed * dt);
    const offroad = Math.abs(player.lane) > 8.5;
    const maximum = player.boost > 0 ? 54 : offroad ? 23 : 39;
    let acceleration = keys.gas ? 15 * (1 - .35 * player.speed / maximum) : -5;
    if (keys.brake) acceleration -= 33;
    if (offroad && player.speed > maximum) acceleration -= 26;
    if (player.speed > maximum) acceleration -= 18;
    if (player.boost > 0 && !keys.brake) acceleration += 30;
    if (player.stun > 0) acceleration -= 15;
    player.speed = clamp(player.speed + acceleration * dt, 0, 57);
    const wantsDrift = keys.drift && Math.abs(steering) > 0 && player.speed > 13 && !offroad && player.stun <= 0;
    if (wantsDrift) {
      driftCharge = Math.min(3, driftCharge + dt);
      if (Math.random() < .65) emitSparks(trackPosition(player.progress - 1.2, player.lane + (steering > 0 ? .9 : -.9), .35), driftCharge >= 2 ? '#ffab36' : '#53d9ff', 2);
    } else if (drifting) {
      if (!keys.drift && driftCharge >= .75) { player.boost = Math.max(player.boost, driftCharge >= 2 ? 2.3 : 1.2); toast(driftCharge >= 2 ? 'SUPER-TURBO · Dérapage parfait !' : 'MINI-TURBO !', 1.5); beep(950, .2); }
      driftCharge = 0;
    }
    drifting = wantsDrift;
    const turnRate = (wantsDrift ? .75 : .98) * clamp(player.speed / 13, 0, 1);
    player.heading += steering * turnRate * dt;
    player.heading -= angleDiff(ahead.yaw, s.yaw);
    player.heading *= Math.exp(-(wantsDrift ? 1.2 : 2.1) * dt);
    player.heading = clamp(player.heading, -.85, .85);
    const desiredLateral = Math.sin(player.heading) * player.speed * (wantsDrift ? .38 : 1);
    player.lateralSpeed = lerp(player.lateralSpeed, desiredLateral, 1 - Math.exp(-(wantsDrift ? 3.1 : 8) * dt));
    player.lane += player.lateralSpeed * dt;
    player.progress += Math.max(0, Math.cos(player.heading) * player.speed) * dt;
    if (Math.abs(player.lane) > 11.2) {
      player.lane = Math.sign(player.lane) * 11.2;
      player.lateralSpeed *= -.3; player.heading *= -.2;
      if (player.collision <= 0) { player.speed *= .65; player.collision = .7; emitSparks(trackPosition(player.progress, player.lane, .5), '#ffbc5c', 14); beep(110); }
    }
    const lap = Math.floor(Math.max(0, player.progress) / LENGTH);
    if (lap > lastLap) {
      const duration = elapsed - lapStart; bestLap = Math.min(bestLap, duration); lapStart = elapsed; lastLap = lap;
      if (lap >= 3) finishRace();
      else { toast(lap === 2 ? 'DERNIER TOUR · Donne tout !' : `TOUR 2 / 3 · ${formatTime(duration)}`, 3); beep(850, .3); }
    }
  }
  function updateAI(racer, dt) {
    if (racer.finish !== null) { racer.speed = Math.max(0, racer.speed - dt * 10); return; }
    const difficulty = $('difficulty').value;
    const base = difficulty === 'easy' ? 25 : difficulty === 'hard' ? 36 : 31;
    const bend = Math.abs(angleDiff(sample(racer.progress + 24).yaw, sample(racer.progress).yaw));
    const maximum = racer.boost > 0 ? 49 : base + racer.index * .25 - Math.min(9, bend * 10);
    racer.speed = lerp(racer.speed, racer.stun > 0 ? 11 : maximum, 1 - Math.exp(-dt * .85));
    let targetLane = Math.sin(racer.progress * .012 + racer.index * 2.3) * 4.7;
    for (const other of racers) if (other !== racer && other.progress > racer.progress && other.progress - racer.progress < 8 && Math.abs(other.lane - targetLane) < 2.5) targetLane += targetLane > 0 ? -3 : 3;
    racer.lane = lerp(racer.lane, clamp(targetLane, -6.7, 6.7), 1 - Math.exp(-dt * 1.3));
    racer.progress += racer.speed * dt;
    racer.heading = Math.sin(animTime * 2 + racer.index) * .02;
    racer.aiTimer -= dt;
    if (racer.aiTimer <= 0) { useItem(racer); racer.aiTimer = 4 + Math.random() * 5; }
    if (racer.progress >= LENGTH * 3) racer.finish = elapsed;
  }
  function signedDistance(a, b) { return mod(a - b + LENGTH / 2, LENGTH) - LENGTH / 2; }
  function updateInteractions(dt) {
    pickups.forEach(p => {
      p.cooldown = Math.max(0, p.cooldown - dt); p.object.visible = p.cooldown === 0;
      if (p.cooldown > 0) return;
      for (const r of racers) {
        if (r.finish !== null || r.item || Math.abs(signedDistance(r.progress, p.progress)) > 2 || Math.abs(r.lane - p.lane) > 1.75) continue;
        r.item = randomItem(r); p.cooldown = 6; p.object.visible = false;
        if (r === player) { updateItem(); toast(`OBJET · ${ITEM_TYPES[r.item].name}`, 1.3); beep(1100, .12); }
        break;
      }
    });
    racers.forEach((r, i) => {
      if (r.finish !== null) return;
      for (const pad of pads) if (r.padCooldown <= 0 && Math.abs(signedDistance(r.progress, pad.progress)) < 3.2 && Math.abs(r.lane - pad.lane) < 2.5) { r.boost = Math.max(r.boost, 1.3); r.padCooldown = 2; if (r === player) { toast('PISTE TURBO !', 1); beep(750); } }
      for (let j = i + 1; j < racers.length; j++) {
        const other = racers[j];
        if (other.finish !== null || r.collision > 0 || other.collision > 0 || Math.abs(signedDistance(r.progress, other.progress)) > 2.5 || Math.abs(r.lane - other.lane) > 1.9) continue;
        const push = r.lane >= other.lane ? 1 : -1;
        r.lane = clamp(r.lane + push * .7, -11, 11); other.lane = clamp(other.lane - push * .7, -11, 11);
        if (r.shield <= 0) r.speed *= .86;
        if (other.shield <= 0) other.speed *= .86;
        r.collision = other.collision = .8;
        if (r === player || other === player) beep(150, .08, .04);
      }
    });
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i]; h.life -= dt; h.age += dt;
      for (const r of racers) if (r.finish === null && (r !== h.owner || h.age > 2) && Math.abs(signedDistance(r.progress, h.progress)) < 1.6 && Math.abs(r.lane - h.lane) < 1.3) { hit(r, 'AÏE · Tu as touché une mine !'); h.life = 0; break; }
      if (h.life <= 0) { scene.remove(h.object); hazards.splice(i, 1); }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]; p.life -= dt; p.progress += 70 * dt; p.lane = lerp(p.lane, p.target.lane, 1 - Math.exp(-dt * 5));
      p.object.position.copy(trackPosition(p.progress, p.lane, .8));
      emitSparks(p.object.position, '#ffa443', 1);
      if (Math.hypot(p.progress - p.target.progress, p.lane - p.target.lane) < 1.5) { if (p.target.finish === null) hit(p.target, 'IMPACT · Un missile t’a touché !'); p.life = 0; }
      if (p.life <= 0) { scene.remove(p.object); projectiles.splice(i, 1); }
    }
  }
  function updateKart(racer, dt) {
    const s = sample(racer.progress), model = racer.model;
    model.root.position.copy(s.p).addScaledVector(s.right, racer.lane);
    model.root.position.y += .08 + (racer.speed > 5 ? Math.sin(animTime * 35 + racer.index) * .018 : 0);
    model.root.rotation.set(-Math.atan2(s.tangent.y, Math.hypot(s.tangent.x, s.tangent.z)), s.yaw + racer.heading * (racer === player && drifting ? 1.5 : 1), 0, 'YXZ');
    model.body.rotation.z = lerp(model.body.rotation.z, -racer.heading * .1, Math.min(1, dt * 10));
    if (racer.stun > 0) model.body.rotation.y = Math.sin(racer.stun * 20) * .22; else model.body.rotation.y = 0;
    model.wheels.forEach(w => { w.tire.rotation.y += racer.speed * dt / .38; w.hub.rotation.y += racer.speed * dt / .38; if (w.front) w.pivot.rotation.y = racer.heading * .7; });
    model.flames.forEach(f => { f.visible = racer.boost > 0; f.scale.y = 1.1 + Math.sin(animTime * 70) * .4; });
    model.shield.visible = racer.shield > 0;
    if (racer.shield > 0) model.shield.rotation.y += dt;
  }
  function updateCamera(dt, snap = false) {
    let position, target;
    if (mode === 'menu') {
      const s = sample(player.progress), forward = s.tangent;
      target = player.model.root.position.clone().add(v3(0, 1, 0));
      position = target.clone().addScaledVector(s.right, 7 + Math.sin(animTime * .1) * .7).addScaledVector(forward, 7).add(v3(0, 2.6, 0));
      target.addScaledVector(s.right, -4.5).addScaledVector(forward, 1);
      camera.fov = 49;
    } else {
      const s = sample(player.progress), forward = s.tangent;
      const distance = cameraMode ? 6 : 10.5 + player.speed * .045;
      position = player.model.root.position.clone().addScaledVector(forward, -distance).add(v3(0, cameraMode ? 3 : 5.3, 0));
      position.addScaledVector(s.right, -player.heading * 1.3);
      target = trackPosition(player.progress + 12 + player.speed * .18, player.lane * .7, 1.3);
      camera.fov = lerp(camera.fov, player.boost > 0 ? 70 : 58, 1 - Math.exp(-dt * 3));
    }
    camera.position.lerp(position, snap ? 1 : 1 - Math.exp(-dt * 7));
    camera.lookAt(target); camera.updateProjectionMatrix();
    sun.position.copy(player.model.root.position).add(v3(-170, 250, 120)); sun.target.position.copy(player.model.root.position);
  }
  function drawMap(canvas, live) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min((w - 36) / 410, (h - 26) / 410);
    const point = p => [w / 2 + p.x * scale, h / 2 + p.z * scale];
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    track.forEach((s, i) => { const [x, y] = point(s.p); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.closePath(); ctx.strokeStyle = '#102b36a0'; ctx.lineWidth = live ? 11 : 9; ctx.stroke();
    ctx.strokeStyle = live ? '#d3e3dd99' : '#edf2df'; ctx.lineWidth = live ? 4 : 3; ctx.stroke();
    const [sx, sy] = point(track[0].p); ctx.fillStyle = '#ff7545'; ctx.fillRect(sx - 3, sy - 4, 6, 8);
    if (live) [...racers].reverse().forEach(r => {
      const [x, y] = point(sample(r.progress).p); ctx.beginPath(); ctx.arc(x, y, r === player ? 4.5 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = r === player ? '#ff7545' : `#${r.model.paint.color.getHexString()}`; ctx.fill();
      if (r === player) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    });
  }
  function updateHUD() {
    $('position').textContent = String(ordering().indexOf(player) + 1);
    $('lap').innerHTML = `${Math.min(3, Math.floor(Math.max(0, player.progress) / LENGTH) + 1)} <span>/ 3</span>`;
    $('time').textContent = formatTime(elapsed); $('best-lap').textContent = formatTime(bestLap);
    $('speed').textContent = String(Math.round(player.speed * 3.6)); $('speed-bar').style.width = `${Math.min(100, player.speed / 54 * 100)}%`;
    $('drift-bar').style.width = `${driftCharge / 3 * 100}%`; $('drift-bar').style.background = driftCharge >= 2 ? '#ffac3b' : '#5ce3ff';
    $('drive-state').textContent = player.stun > 0 ? 'IMPACT !' : player.boost > 0 ? 'ϟ TURBO' : player.shield > 0 ? `BOUCLIER · ${Math.ceil(player.shield)} S` : drifting ? driftCharge >= 2 ? 'SUPER-TURBO PRÊT' : 'DÉRAPAGE' : Math.abs(player.lane) > 8.5 ? 'GRAVIER · RALENTI' : mode === 'countdown' ? 'PRÊT À PARTIR' : 'RIVIERA GP';
    drawMap($('minimap'), true);
  }
  function step(dt) {
    if (mode === 'race') {
      elapsed += dt;
      racers.forEach(r => { for (const key of ['boost', 'shield', 'stun', 'collision', 'padCooldown']) r[key] = Math.max(0, r[key] - dt); });
      for (const racer of racers.slice(1)) updateAI(racer, dt);
      updatePlayer(dt);
      if (mode === 'race') updateInteractions(dt);
    } else if (mode === 'countdown') {
      const before = Math.ceil(countdown); countdown -= dt;
      if (countdown <= 0) { mode = 'race'; $('countdown').textContent = 'GO !'; beep(1100, .35); toast('C’EST PARTI · Accélère !', 1.7); }
      else if (Math.ceil(countdown) !== before) { $('countdown').textContent = String(Math.min(3, Math.ceil(countdown))); beep(450); }
    }
  }
  function frame(now) {
    const dt = Math.min((now - (lastFrame || now)) / 1000, .05); lastFrame = now;
    if (mode !== 'paused' && !document.hidden) {
      animTime += dt;
      let remaining = dt;
      while (remaining > 0) { const slice = Math.min(remaining, 1 / 120); step(slice); remaining -= slice; }
      racers.forEach(r => updateKart(r, dt));
      pickups.forEach(p => { p.object.rotation.y = animTime; p.object.rotation.z = Math.sin(animTime * 1.5) * .15; p.object.position.y = sample(p.progress).p.y + 1.8 + Math.sin(animTime * 2 + p.lane) * .25; });
      waterTexture.offset.x = animTime * .002;
      sparkData.forEach((p, i) => {
        p.life -= dt;
        if (p.life > 0) { p.velocity.y -= dt * 12; p.position.addScaledVector(p.velocity, dt); sparkPositions.set([p.position.x, p.position.y, p.position.z], i * 3); }
        else sparkPositions.set([0, -100, 0], i * 3);
      });
      sparkGeometry.attributes.position.needsUpdate = true;
      if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').hidden = true; }
      if (mode === 'race' && elapsed > .8) $('countdown').hidden = true;
      updateCamera(dt);
      uiTimer += dt; if (uiTimer > .08 && mode !== 'menu') { updateHUD(); uiTimer = 0; }
    }
    if (audio && engineGain) {
      engine.frequency.setTargetAtTime(38 + player.speed * 3 + (drifting ? 12 : 0), audio.currentTime, .08);
      engineGain.gain.setTargetAtTime(soundOn && (mode === 'race' || mode === 'countdown') ? .025 + player.speed / 2000 : 0, audio.currentTime, .05);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  document.addEventListener('keydown', event => {
    const inDialog = document.querySelector('dialog[open]');
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (mode === 'paused') { event.preventDefault(); resumeRace(); }
      else if (!inDialog && (mode === 'race' || mode === 'countdown')) { event.preventDefault(); pauseRace(); }
      return;
    }
    if (mode !== 'race' && mode !== 'countdown' || inDialog) return;
    if (keyMap[event.code]) { event.preventDefault(); heldKeys.add(event.code); updateKeys(); }
    if (event.repeat) return;
    if (event.code === 'KeyE' || event.code === 'Enter') { event.preventDefault(); useItem(player); }
    if (event.code === 'KeyC') cameraMode = 1 - cameraMode;
    if (event.code === 'KeyR' && mode === 'race') { player.lane = 0; player.heading = 0; player.lateralSpeed = 0; player.speed *= .5; drifting = false; driftCharge = 0; toast('KART REPLACÉ', 1); }
  });
  document.addEventListener('keyup', event => { heldKeys.delete(event.code); updateKeys(); });
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !touch) { touch = true; document.body.classList.add('touch'); $('touch-controls').hidden = mode !== 'race' && mode !== 'countdown'; }
  });
  addEventListener('blur', () => { clearKeys(); pauseRace(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearKeys(); pauseRace(); } });
  document.querySelectorAll('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touchKeys.set(event.pointerId, button.dataset.key); button.classList.add('active'); updateKeys(); });
    const release = event => { touchKeys.delete(event.pointerId); button.classList.remove('active'); updateKeys(); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  });
  $('start').addEventListener('click', startRace); $('replay').addEventListener('click', startRace); $('restart').addEventListener('click', startRace);
  $('pause').addEventListener('click', pauseRace); $('resume').addEventListener('click', resumeRace);
  $('quit').addEventListener('click', showMenu); $('results-menu').addEventListener('click', showMenu);
  $('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resumeRace(); });
  $('results-dialog').addEventListener('cancel', event => { event.preventDefault(); showMenu(); });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal()); $('help-close').addEventListener('click', () => $('help-dialog').close());
  $('item').addEventListener('click', () => useItem(player));
  $('sound').addEventListener('click', () => {
    initAudio(); soundOn = !soundOn && !!audio;
    $('sound').querySelector('span').textContent = soundOn ? 'ON' : 'OFF'; $('sound').setAttribute('aria-pressed', String(soundOn)); $('sound').setAttribute('aria-label', soundOn ? 'Couper le son' : 'Activer le son');
    if (!audio) toast('Le son est indisponible dans ce navigateur.');
    beep(600);
  });
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('Le plein écran n’est pas disponible sur ce navigateur.'); }
    catch (_) { toast('Le navigateur n’a pas autorisé le plein écran.'); }
  });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
    player.model.paint.color.setHex(Number(button.dataset.color)); player.model.suit.color.setHex(Number(button.dataset.color));
    document.querySelectorAll('[data-color]').forEach(swatch => { swatch.classList.toggle('selected', swatch === button); swatch.setAttribute('aria-pressed', String(swatch === button)); });
  }));
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioLimit)); });
  $('game').addEventListener('webglcontextlost', event => { event.preventDefault(); pauseRace(); fail('La connexion au moteur graphique a été interrompue. Recharge la page pour relancer le jeu.'); });
  resetRace(); drawMap($('preview-map'), false); updateCamera(1, true);
  $('start').disabled = false; $('start').querySelector('span').textContent = 'PRENDRE LE DÉPART';
  requestAnimationFrame(frame);
})();
