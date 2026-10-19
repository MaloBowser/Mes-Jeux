(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createMenus = ({ T, renderer, garage, onChange, onPreviewPaint, onPlay }) => {
    const $ = id => document.getElementById(id), thumbnails = {};
    let screen = 'home', shopSelection = garage.state.paint;
    function thumbnail(driver, vehicle, portrait) {
      const scene = new T.Scene(); scene.background = new T.Color('#17364e');
      scene.add(new T.HemisphereLight('#ebfaff', '#7c8c9d', 3));
      const light = new T.DirectionalLight('#fff1da', 3); light.position.set(-3, 5, 5); scene.add(light);
      const model = api.createKart(T, { driver, vehicle, paint: 'original' }); scene.add(model.root);
      const camera = new T.PerspectiveCamera(portrait ? 36 : 42, 2, .1, 30);
      camera.position.set(portrait ? 1.4 : 3.5, portrait ? 2.25 : 2.8, portrait ? 3.7 : 4.6);
      camera.lookAt(0, portrait ? 1.65 : 1, 0);
      renderer.setSize(320, 160, false); renderer.render(scene, camera);
      const image = renderer.domElement.toDataURL('image/png'); api.disposeObject(scene); return image;
    }
    const size = renderer.getSize(new T.Vector2()), ratio = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    for (const id of Object.keys(api.drivers)) thumbnails[`driver-${id}`] = thumbnail(id, 'standard', true);
    for (const id of Object.keys(api.vehicles)) thumbnails[`vehicle-${id}`] = thumbnail('malo', id, false);
    renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false);
    function wallet() {
      $('wallet').textContent = garage.state.coins;
      $('save-status').textContent = garage.available ? '' : 'Stockage indisponible : tes pièces et achats sont conservés uniquement pour cette session.';
    }
    function map(canvas, id) {
      const ctx = canvas.getContext('2d'), points = api.createTrack(T, id).points, theme = api.courses[id];
      ctx.fillStyle = theme.sky; ctx.fillRect(0, 0, 320, 160);
      ctx.beginPath(); points.forEach((p, i) => { const x = 160 + p.x * .5, y = 80 + p.z * .5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#152637'; ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = theme.accent; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#ffdf60'; ctx.beginPath(); ctx.arc(160 + points[0].x * .5, 80 + points[0].z * .5, 5, 0, Math.PI * 2); ctx.fill();
    }
    function show(next) {
      screen = next; garage.read(); onPreviewPaint(garage.state.paint);
      $('home').hidden = screen !== 'home'; $('garage-panel').hidden = screen === 'home'; document.body.classList.toggle('selecting', screen !== 'home');
      if (screen === 'shop') shopSelection = garage.state.paint;
      $('shop-status').textContent = ''; render();
    }
    function render() {
      wallet(); const state = garage.state;
      $('current-choice').textContent = `${api.drivers[state.driver].name} · ${api.vehicles[state.vehicle].name} · ${api.courses[state.course].name}`;
      if (screen === 'home') return;
      document.querySelectorAll('#category-tabs [data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
      const labels = { driver: ['01 / PRÉPARER LA COURSE', 'CHOIX DU PILOTE'], vehicle: ['02 / PRÉPARER LA COURSE', 'CHOIX DU VÉHICULE'], course: ['03 / PRÉPARER LA COURSE', 'CHOIX DU CIRCUIT'], shop: ['PIÈCES RAMASSÉES EN COURSE', 'LA BOUTIQUE'] };
      $('selection-step').textContent = labels[screen][0]; $('selection-title').textContent = labels[screen][1];
      const entries = { driver: api.drivers, vehicle: api.vehicles, course: api.courses, shop: api.paints }[screen];
      const selected = screen === 'shop' ? shopSelection : state[screen];
      $('cards').replaceChildren();
      for (const [id, item] of Object.entries(entries)) {
        const card = document.createElement('button'); card.className = 'card'; card.dataset.choice = id; card.setAttribute('aria-pressed', String(selected === id));
        if (screen === 'course') { const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 160; card.append(canvas); map(canvas, id); }
        else if (screen === 'shop') { const sample = document.createElement('div'); sample.className = 'paint-sample'; sample.style.setProperty('--paint', item.color || api.vehicles[state.vehicle].color); const symbol = document.createElement('b'); symbol.textContent = 'MK'; sample.append(symbol); card.append(sample); }
        else { const img = document.createElement('img'); img.src = thumbnails[`${screen}-${id}`]; img.alt = ''; card.append(img); }
        const label = document.createElement('span'); label.className = 'label'; label.textContent = item.name;
        const tag = document.createElement('small'); tag.textContent = screen === 'course' ? item.difficulty : screen === 'shop' ? state.owned.includes(id) ? 'ACQUIS' : `${item.price} ◉` : selected === id ? '✓' : '';
        label.append(tag); card.append(label); card.onclick = () => {
          if (screen === 'shop') { shopSelection = id; onPreviewPaint(id); }
          else { garage.select(screen, id); onChange(screen); }
          $('shop-status').textContent = ''; render();
        }; $('cards').append(card);
      }
      const item = entries[selected]; $('detail-name').textContent = item.name;
      $('detail-description').textContent = screen === 'shop' ? 'Une couleur pour tous tes véhicules. Achat unique, sans argent réel. Portefeuille : 100 pièces maximum.' : item.description;
      $('stats').replaceChildren();
      if (screen === 'vehicle') {
        for (const [label, value, max, suffix] of [['Vitesse',item.speed * 3.6,150,'km/h'],['Accélération',item.acceleration,20,''],['Maniabilité',item.handling,1.4,''],['Poids',item.weight,1.5,'']]) {
          const row = document.createElement('div'); row.className = 'stat'; const text = document.createElement('b'); text.textContent = label;
          const bar = document.createElement('span'), fill = document.createElement('i'); fill.style.width = `${value / max * 100}%`; bar.append(fill);
          const number = document.createElement('small'); number.textContent = `${Math.round(value * 10) / 10} ${suffix}`; row.append(text, bar, number); $('stats').append(row);
        }
      }
      $('start').hidden = screen !== 'course'; $('continue').hidden = screen === 'course'; $('continue').disabled = false;
      $('continue').textContent = screen === 'driver' ? 'CHOISIR MON VÉHICULE ↗' : 'CHOISIR MON CIRCUIT ↗';
      if (screen === 'shop') {
        const owned = state.owned.includes(selected), equipped = state.paint === selected;
        $('continue').textContent = equipped ? 'COULEUR ÉQUIPÉE ✓' : owned ? 'ÉQUIPER CETTE COULEUR' : `ACHETER · ${item.price} PIÈCES`;
        $('continue').disabled = equipped || !owned && state.coins < item.price;
        if (!owned && state.coins < item.price) $('shop-status').textContent = `Il te manque ${item.price - state.coins} pièces. Ramasse les pièces dorées sur les circuits !`;
      }
    }
    document.querySelectorAll('[data-screen]').forEach(button => { button.onclick = () => show(button.dataset.screen); });
    $('play').onclick = () => show('driver'); $('start').onclick = onPlay;
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
