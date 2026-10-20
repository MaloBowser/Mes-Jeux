(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fail = text => { $('error-text').textContent = text; $('error').hidden = false; };
  $('reload').onclick = () => location.reload();
  if (!window.THREE) { fail('Le moteur local est absent. Garde le dossier web/vendor avec le jeu.'); return; }
  const T = window.THREE, api = window.MaloPrototype;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (_) { fail('WebGL est indisponible. Active l’accélération graphique dans Chrome, puis recharge la page.'); return; }
  let resolution = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(resolution); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const garage = api.createGarage();
  const audio = api.createAudio();
  let track, simulation, view, race, raceView, menus, vehicleId, earned = 0;
  function rebuild() {
    if (view) api.disposeObject(view.scene);
    track = api.createTrack(T, garage.state.course);
    simulation = api.createSimulation(track, api.vehicles[garage.state.vehicle]);
    vehicleId = garage.state.vehicle;
    view = api.createScene(T, renderer, track, garage.state);
    race = api.createRace(track, simulation, garage.state);
    raceView = api.createRaceView(T, view.scene, track, race);
    raceView.update(0, false);
    view.update(simulation.state, 0, true, true);
  }
  rebuild();
  const held = new Set();
  const bindings = { ArrowUp: 'gas', KeyZ: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyQ: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'drift' };
  const input = { gas: false, brake: false, left: false, right: false, drift: false };
  let mode = 'menu', previousMode = 'race', countdown = 3, lastFrame = 0, accumulator = 0, sampleTime = 0, sampleFrames = 0, goTime = 0;
  function clearInput() { held.clear(); Object.keys(input).forEach(key => { input[key] = false; }); }
  function syncInput() { Object.keys(input).forEach(key => { input[key] = [...held].some(code => bindings[code] === key); }); }
  function closeDialogs() { for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); }
  function start() {
    audio.silence(); audio.unlock(); audio.play('countdown');
    closeDialogs(); simulation.reset(); race.reset(); earned = 0; view.coins.forEach(c => { c.lap = -1; c.object.visible = true; }); clearInput(); accumulator = 0; countdown = 3; goTime = 0; mode = 'countdown';
    $('intro').hidden = true; $('hud').hidden = false; document.body.classList.add('racing'); document.body.classList.remove('selecting');
    $('countdown').hidden = false; $('countdown').textContent = '3';
    view.update(simulation.state, 0, false, true); raceView.update(0, true); updateHUD();
  }
  function menu() {
    audio.silence();
    closeDialogs(); clearInput(); simulation.reset(); race.reset(); raceView.update(0, false); mode = 'menu'; accumulator = 0;
    $('hud').hidden = true; $('intro').hidden = false; $('countdown').hidden = true; document.body.classList.remove('racing');
    menus?.show('home'); view.setKart(garage.state);
    view.update(simulation.state, 0, true, true);
  }
  function pause() {
    if (mode !== 'race' && mode !== 'countdown') return;
    previousMode = mode; mode = 'paused'; clearInput(); audio.silence(); $('pause-dialog').showModal();
  }
  function resume() { if (mode !== 'paused') return; closeDialogs(); clearInput(); audio.unlock(); mode = previousMode; accumulator = 0; }
  function useItem() {
    if (mode !== 'race') return;
    const item = race.player.item;
    if (race.useItem()) audio.play(item);
    updateHUD();
  }
  function clock(seconds) { return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`; }
  function updateHUD() {
    const s = simulation.state;
    const rank = race.standings().indexOf(race.player) + 1, item = api.items[race.player.item];
    $('position').innerHTML = `${rank}<span> / 6</span>`;
    $('race-time').textContent = clock(race.elapsed);
    $('item-symbol').textContent = item ? item.symbol : '?';
    $('item-name').textContent = item ? item.name : 'Aucun objet';
    const reserve = api.items[race.player.reserveItem];
    $('reserve-symbol').textContent = reserve ? reserve.symbol : '?';
    $('reserve-name').textContent = reserve ? reserve.name : 'Vide';
    $('use-item').disabled = !item || mode !== 'race';
    $('use-item').title = item ? item.hint : 'Traverse une boîte ? sur la piste';
    $('race-notice').textContent = race.notice;
    $('drift-charge').value = s.driftCharge;
    $('lap').innerHTML = `${Math.min(2, s.laps + 1)} <span>/ 2</span>`;
    $('checkpoint').textContent = `${s.nextGate === 0 ? 7 : s.nextGate - 1} / 7`;
    $('message').textContent = s.nextGate === 0 ? 'Tous validés · Rejoins la ligne' : `Prochaine porte : 0${s.nextGate}`;
    $('speed').textContent = Math.round(s.speed * 3.6);
    $('handling').textContent = s.stun > 0 ? 'TOUCHÉ !' : s.boost > 0 ? 'TURBO !' : s.shield > 0 ? 'BOUCLIER ACTIF' : s.impact > 0 ? 'CONTACT AVEC LA BARRIÈRE' : s.driftCharge >= .8 ? 'RELÂCHE ESPACE : MINI-TURBO' : s.drift ? 'DÉRAPAGE · CHARGE LE TURBO' : garage.state.coins === 100 ? 'PORTEFEUILLE PLEIN · 100 PIÈCES' : api.courses[track.id].name.toUpperCase();
  }
  function tick(dt) {
    if (mode === 'countdown') {
      const previousCount = Math.ceil(countdown);
      countdown -= dt; $('countdown').textContent = Math.max(1, Math.ceil(countdown));
      if (countdown <= 0) { mode = 'race'; goTime = .7; $('countdown').textContent = 'GO !'; audio.play('go'); }
      else if (Math.ceil(countdown) < previousCount) audio.play('countdown');
    } else if (mode === 'race') {
      const s = simulation.state;
      const itemCount = Number(!!race.player.item) + Number(!!race.player.reserveItem);
      const stun = s.stun, impact = s.impact, boost = s.boost;
      simulation.step(dt, input);
      race.step(dt);
      if (Number(!!race.player.item) + Number(!!race.player.reserveItem) > itemCount) audio.play('pickup');
      if (s.stun > stun || impact === 0 && s.impact > 0) audio.play('hit');
      if (s.boost > boost) audio.play('turbo');
      for (const coin of view.coins) {
        coin.object.visible = coin.lap !== s.laps;
        if (!s.finished && coin.lap !== s.laps && garage.state.coins < 100 && Math.hypot(s.x - coin.x, s.z - coin.z) < 1.6) {
          const amount = garage.credit(1);
          if (amount) { earned += amount; coin.lap = s.laps; coin.object.visible = false; menus.wallet(); audio.play('coin'); }
        }
      }
      if (goTime > 0) { goTime -= dt; if (goTime <= 0) $('countdown').hidden = true; }
      if (simulation.state.finished) {
        mode = 'finished'; clearInput(); $('countdown').hidden = true;
        audio.silence(); audio.play('finish');
        const order = race.standings(), rank = order.indexOf(race.player) + 1;
        $('finish-title').textContent = rank === 1 ? 'VICTOIRE !' : `${rank}e PLACE !`;
        $('finish-course').textContent = `${api.courses[track.id].name} · ${clock(race.elapsed)}`;
        $('results').replaceChildren(...order.map(racer => {
          const row = document.createElement('li');
          row.classList.toggle('is-player', racer === race.player);
          row.textContent = `${racer.name} · ${racer.finishTime === null ? 'En piste' : clock(racer.finishTime)}`; return row;
        }));
        $('earned').textContent = `${earned} pièces ramassées · Portefeuille : ${garage.state.coins} / 100`; $('finish-dialog').showModal();
      }
    }
  }
  function frame(now) {
    const raw = lastFrame ? (now - lastFrame) / 1000 : 0; lastFrame = now;
    const dt = Math.min(raw, .05);
    if (mode === 'race' || mode === 'countdown') {
      accumulator += dt;
      while (accumulator >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
      updateHUD();
    }
    if (mode !== 'paused') { view.update(simulation.state, dt, mode === 'menu'); raceView.update(dt, mode !== 'menu'); }
    audio.update(simulation.state, mode === 'race');
    if (!document.hidden && mode === 'race' && raw < .2) {
      sampleTime += raw; sampleFrames++;
      if (sampleTime >= 4) {
        if (garage.state.quality === 'auto' && sampleTime / sampleFrames > .024) {
          resolution = Math.max(.75, resolution - .25); renderer.setPixelRatio(resolution);
          if (resolution <= 1) renderer.shadowMap.enabled = false;
        }
        sampleTime = sampleFrames = 0;
      }
    }
    renderer.render(view.scene, view.camera); requestAnimationFrame(frame);
  }
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape' && $('options-dialog').open) { event.preventDefault(); $('options-dialog').close(); return; }
    if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) mode === 'paused' ? resume() : pause(); return; }
    if ((event.code === 'KeyE' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') && mode === 'race') { event.preventDefault(); if (!event.repeat) useItem(); return; }
    if ((mode === 'race' || mode === 'countdown') && bindings[event.code]) { event.preventDefault(); held.add(event.code); syncInput(); }
  });
  document.addEventListener('keyup', event => { held.delete(event.code); syncInput(); });
  $('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resume(); });
  $('finish-dialog').addEventListener('cancel', event => { event.preventDefault(); });
  addEventListener('blur', () => { clearInput(); pause(); audio.silence(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); audio.silence(); } });
  $('replay').onclick = start; $('restart').onclick = start;
  $('use-item').onclick = useItem;
  $('pause').onclick = pause; $('resume').onclick = resume; $('back').onclick = menu; $('finish-back').onclick = menu;
  addEventListener('resize', () => { view.camera.aspect = innerWidth / innerHeight; view.camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  $('game').addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); fail('Le contexte graphique a été perdu. Recharge la page pour recommencer.'); });
  menus = api.createMenus({ T, renderer, garage, onPlay: start,
    onChange(field) { if (field === 'course' || field === 'vehicle') rebuild(); else { view.setKart(garage.state); view.update(simulation.state, 0, true, true); } },
    onPreviewPaint(paint) { if (track.id !== garage.state.course || vehicleId !== garage.state.vehicle) rebuild(); view.setKart({ ...garage.state, paint }); view.update(simulation.state, 0, true, true); }
  });
  function applyQuality() {
    resolution = garage.state.quality === 'low' ? .8 : Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(resolution); renderer.shadowMap.enabled = garage.state.quality !== 'low';
  }
  $('quality').value = garage.state.quality;
  $('quality').onchange = () => { garage.quality($('quality').value); applyQuality(); menus.wallet(); };
  $('sound-enabled').onchange = () => audio.setEnabled($('sound-enabled').checked);
  $('options').onclick = () => $('options-dialog').showModal();
  $('options-close').onclick = () => $('options-dialog').close();
  addEventListener('storage', () => { garage.read(); menus.wallet(); });
  applyQuality(); menu();
  requestAnimationFrame(frame);
})();
