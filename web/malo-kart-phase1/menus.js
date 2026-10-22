(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createMenus = ({ T, renderer, garage, onChange, onPreviewPaint, onPlay }) => {
    const $ = id => document.getElementById(id), thumbnails = {};
    let screen = 'home', shopSelection = garage.state.paint, activePart = 'vehicle';
    const parts = { vehicle: api.vehicles, tire: api.tires, glider: api.gliders };
    function thumbnail(driver, vehicle, portrait, part, id) {
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight('#ebfaff', '#7c8c9d', 3));
      const light = new T.DirectionalLight('#fff1da', 3); light.position.set(-3, 5, 5); scene.add(light);
      const model = api.createKart(T, { driver, vehicle, tire: part === 'tire' ? id : 'standard', glider: part === 'glider' ? id : 'delta', paint: 'original' }); scene.add(model.root);
      if (!portrait) model.pilot.visible = false;
      model.glider.visible = false;
      const camera = new T.PerspectiveCamera(portrait ? 36 : 34, 1, .1, 30);
      camera.position.set(portrait ? 1.4 : 3.5, portrait ? 2.25 : 2.8, portrait ? 3.7 : 4.6);
      camera.lookAt(0, portrait ? 1.65 : .65, 0);
      if (part) {
        const object = part === 'tire' ? model.wheels[0].pivot : model.glider;
        scene.attach(object); object.position.set(0, 0, 0); object.scale.setScalar(1); object.visible = true; model.root.visible = false;
        camera.position.set(...(part === 'tire' ? [-1.8, .8, 1.7] : [2, 3.3, 5.5])); camera.lookAt(0, 0, 0);
      }
      renderer.setSize(192, 192, false); renderer.render(scene, camera);
      const image = renderer.domElement.toDataURL('image/png'); api.disposeObject(scene); return image;
    }
    const size = renderer.getSize(new T.Vector2()), ratio = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    for (const id of Object.keys(api.drivers)) thumbnails[`driver-${id}`] = api.drivers[id].guest ? `assets/portraits/${id}.png` : thumbnail(id, 'standard', true);
    for (const id of Object.keys(api.vehicles)) thumbnails[`vehicle-${id}`] = thumbnail('mario', id, false);
    for (const part of ['tire', 'glider']) for (const id of Object.keys(parts[part])) thumbnails[`${part}-${id}`] = thumbnail('mario', 'standard', false, part, id);
    for (const id of Object.keys(api.courses)) {
      const track = api.createTrack(T, id), view = api.createScene(T, renderer, track, garage.state);
      const simulation = api.createSimulation(track), p = track.points[36];
      Object.assign(simulation.state, { x: p.x, z: p.z, yaw: Math.atan2(p.tx, p.tz) });
      view.update(simulation.state, 0, false, true);
      view.camera.aspect = 2; view.camera.position.y += 3; view.camera.updateProjectionMatrix();
      renderer.setSize(512, 256, false); renderer.render(view.scene, view.camera);
      thumbnails[`course-${id}`] = renderer.domElement.toDataURL('image/jpeg', .88);
      api.disposeObject(view.scene);
    }
    renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false);
    function wallet() {
      $('wallet').textContent = garage.state.coins;
      $('save-status').textContent = garage.available ? '' : 'Stockage indisponible : tes pièces et achats sont conservés uniquement pour cette session.';
    }
    function show(next) {
      screen = next; garage.read(); onPreviewPaint(garage.state.paint);
      document.body.dataset.menu = screen;
      $('home').hidden = screen !== 'home'; $('garage-panel').hidden = screen === 'home'; document.body.classList.toggle('selecting', screen !== 'home');
      if (screen === 'shop') shopSelection = garage.state.paint;
      $('shop-status').textContent = ''; render();
    }
    function render() {
      wallet(); const state = garage.state;
      $('current-choice').textContent = `${api.drivers[state.driver].name} · ${api.vehicles[state.vehicle].name} · ${api.tires[state.tire].name} · ${api.gliders[state.glider].name} · ${api.courses[state.course].name}`;
      if (screen === 'home') return;
      document.querySelectorAll('#category-tabs [data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
      const labels = { driver: ['01 / PRÉPARER LA COURSE', 'CHOIX DU PILOTE'], vehicle: ['02 / PRÉPARER LA COURSE', 'PERSONNALISER LE KART'], course: ['03 / PRÉPARER LA COURSE', 'CHOIX DU CIRCUIT'], shop: ['PIÈCES RAMASSÉES EN COURSE', 'LA BOUTIQUE'] };
      $('selection-step').textContent = labels[screen][0]; $('selection-title').textContent = labels[screen][1];
      const entries = { driver: api.drivers, vehicle: parts[activePart], course: api.courses, shop: api.paints }[screen];
      const selected = screen === 'shop' ? shopSelection : state[screen === 'vehicle' ? activePart : screen];
      $('cards').replaceChildren();
      function appendCard(parent, field, id, item) {
        const chosen = screen === 'shop' ? shopSelection === id : state[field] === id;
        const card = document.createElement('button'); card.className = 'card'; card.dataset.choice = id; card.dataset.part = field; card.setAttribute('aria-pressed', String(chosen));
        card.setAttribute('aria-label', `${screen === 'vehicle' ? { vehicle: 'Kart', tire: 'Roues', glider: 'Aile' }[field] + ' : ' : ''}${item.name}`);
        if (screen === 'course') {
          const medal = document.createElement('span'); medal.className = 'course-medal'; medal.setAttribute('aria-hidden', 'true');
          medal.textContent = { azur: '☀', neon: '☾', desert: '✦' }[id]; card.append(medal);
          const img = document.createElement('img'); img.src = thumbnails[`course-${id}`]; img.alt = `Aperçu de ${item.name}`; card.append(img);
        }
        else if (screen === 'shop') { const sample = document.createElement('div'); sample.className = 'paint-sample'; sample.style.setProperty('--paint', item.color || api.vehicles[state.vehicle].color); const symbol = document.createElement('b'); symbol.textContent = 'MK'; sample.append(symbol); card.append(sample); }
        else { const img = document.createElement('img'); img.src = thumbnails[`${field}-${id}`]; img.alt = ''; card.append(img); }
        const label = document.createElement('span'); label.className = 'label'; label.textContent = item.name;
        const tag = document.createElement('small'); tag.textContent = screen === 'course' ? item.difficulty : screen === 'shop' ? state.owned.includes(id) ? 'ACQUIS' : `${item.price} ◉` : chosen ? '✓' : '';
        label.append(tag); card.append(label); card.onclick = () => {
          if (screen === 'shop') { shopSelection = id; onPreviewPaint(id); }
          else { if (screen === 'vehicle') activePart = field; garage.select(field, id); onChange(field); }
          $('shop-status').textContent = ''; render();
          if (screen === 'vehicle') $('cards').querySelector(`[data-part=${field}][data-choice=${id}]`).focus({ preventScroll: true });
        }; parent.append(card);
      }
      if (screen === 'vehicle') {
        for (const [field, catalog] of Object.entries(parts)) {
          const column = document.createElement('section'); column.className = 'part-column';
          const heading = document.createElement('h3'); heading.textContent = { vehicle: 'KART', tire: 'ROUES', glider: 'AILE' }[field]; column.append(heading);
          for (const [id, item] of Object.entries(catalog)) appendCard(column, field, id, item);
          $('cards').append(column);
        }
      } else {
        for (const [id, item] of Object.entries(entries)) appendCard($('cards'), screen, id, item);
      }
      const item = entries[selected]; $('detail-name').textContent = item.name;
      $('menu-selection').textContent = item.name;
      $('detail-description').textContent = screen === 'shop' ? 'Une couleur pour tous tes véhicules. Achat unique, sans argent réel. Portefeuille : 100 pièces maximum.' : item.description;
      if (screen === 'vehicle' && activePart === 'glider') $('detail-description').textContent += ' Déployée au garage, repliée en course.';
      $('stats').replaceChildren();
      if (screen === 'vehicle') {
        const stats = api.vehicleStats(state);
        for (const [label, value, max, suffix] of [['Vitesse',stats.speed * 3.6,160,'km/h'],['Accélération',stats.acceleration,20,''],['Maniabilité',stats.handling,1.4,''],['Poids',stats.weight,1.6,'']]) {
          const row = document.createElement('div'); row.className = 'stat'; const text = document.createElement('b'); text.textContent = label;
          const bar = document.createElement('span'), fill = document.createElement('i'); fill.style.width = `${value / max * 100}%`; bar.append(fill);
          const number = document.createElement('small'); number.textContent = `${Math.round(value * 10) / 10} ${suffix}`; row.append(text, bar, number); $('stats').append(row);
        }
      }
      $('start').hidden = screen !== 'course'; $('continue').hidden = screen === 'course'; $('continue').disabled = false;
      $('continue').textContent = 'OK →';
      $('continue').setAttribute('aria-label', screen === 'driver' ? 'Confirmer le pilote et choisir le véhicule' : 'Confirmer le véhicule et choisir le circuit');
      if (screen === 'shop') {
        const owned = state.owned.includes(selected), equipped = state.paint === selected;
        $('continue').textContent = equipped ? 'COULEUR ÉQUIPÉE ✓' : owned ? 'ÉQUIPER CETTE COULEUR' : `ACHETER · ${item.price} PIÈCES`;
        $('continue').disabled = equipped || !owned && state.coins < item.price;
        $('continue').setAttribute('aria-label', $('continue').textContent);
        if (!owned && state.coins < item.price) $('shop-status').textContent = `Il te manque ${item.price - state.coins} pièces. Ramasse les pièces dorées sur les circuits !`;
      }
    }
    document.querySelectorAll('[data-screen]').forEach(button => { button.onclick = () => show(button.dataset.screen); });
    $('play').onclick = () => show('driver'); $('start').onclick = onPlay;
    $('menu-back').onclick = () => show({ driver: 'home', vehicle: 'driver', course: 'vehicle', shop: 'home' }[screen]);
    $('continue').onclick = () => {
      if (screen === 'shop') {
        const owned = garage.state.owned.includes(shopSelection);
        const success = owned ? garage.select('paint', shopSelection) : garage.buy(shopSelection);
        if (success) onChange('paint'); render();
        $('shop-status').textContent = success ? owned ? 'Couleur équipée !' : 'Achat réussi ! La couleur est équipée sur ton kart.' : 'Achat impossible. Ton solde a peut-être changé.';
      } else show(screen === 'driver' ? 'vehicle' : 'course');
    };
    $('play').disabled = false; $('play').textContent = '⚑ JOUER'; $('start').disabled = false;
    show('home');
    return { show, render, wallet, get screen() { return screen; } };
  };
})();
