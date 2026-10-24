(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.createMenus = ({ T, renderer, garage, onChange, onPreviewPaint, onPlay }) => {
    const $ = id => document.getElementById(id), thumbnails = {};
    let screen = 'home', shopSelection = garage.state.paint, activePart = 'vehicle', activeCup = api.courses[garage.state.course].cup;
    const emblems = [
      '<circle r="20" fill="#ffe56d"/><path d="M0-35v8M0 35v-8M-35 0h8M35 0h-8M-25-25l6 6M25 25l-6-6M25-25l-6 6M-25 25l6-6" stroke="#ffe56d" stroke-width="6"/>',
      '<path d="M0-34v68M-29-17l58 34M-29 17l58-34M-8-27l8 8 8-8M-8 27l8-8 8 8" stroke="#b7faff" stroke-width="7" stroke-linecap="round"/>',
      '<path d="m-26-10-14-9v36l14-8m52-19 14-9v36L26 9" fill="#ffdf82"/><circle r="26" fill="#ff90c3"/><path d="M-20 5Q-12-25 9-14T18 14Q-12 23-6 0" fill="none" stroke="#fff3e4" stroke-width="9"/>',
      '<path d="M-37 30-14-23H14L37 30Z" fill="#ad809a"/><path d="m-14-23 8 29 9-14 8 23 3-38" fill="#ffb54c"/><path d="M-8-31-14-42M8-31l12-10" stroke="#ffca60" stroke-width="5"/>',
      '<path d="M-31 29v-39h18v-20h25v14h19v45Z" fill="#92dbef"/><path d="M-22 0h4m-4 12h4M-3-18h5m-5 14h5m-5 14h5M20-5h4m-4 14h4" stroke="#fff4a9" stroke-width="6"/>',
      '<path d="m0-37 11 23 25 4-18 18 4 26L0 22-22 34-18 8-18-18 25-4Z" fill="#ffdb68"/><path d="M-7-3v12M7-3v12" stroke="#49406c" stroke-width="4"/>'
    ];
    function cupIcon(index) {
      return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="rim"><stop stop-color="#fff"/><stop offset=".8" stop-color="#c7d6eb"/><stop offset="1" stop-color="#8197b6"/></radialGradient></defs><circle cx="60" cy="60" r="57" fill="url(#rim)" stroke="#effaff" stroke-width="3"/><circle cx="60" cy="60" r="47" fill="#18396a" stroke="#f0f5ff" stroke-width="2"/><circle cx="60" cy="60" r="52" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 7"/><g transform="translate(60 60)">${emblems[index]}</g></svg>`);
    }
    api.cups.forEach((name,i)=>{
      const option=document.createElement('option');option.value=i;option.textContent=name;$('cup-select').append(option);
      const button=document.createElement('button');button.className='cup-medal';button.dataset.cup=i;button.setAttribute('aria-label',name);
      const image=document.createElement('img');image.src=cupIcon(i);image.alt='';const label=document.createElement('span');label.textContent=name;
      button.append(image,label);button.onclick=()=>selectCup(i);$('cup-medals').append(button);
    });
    function selectCup(index) {
      activeCup=index;
      const id=Object.keys(api.courses).find(id=>api.courses[id].cup===activeCup);
      garage.select('course',id);onChange('course');render();
    }
    $('cup-select').onchange=()=>selectCup(Number($('cup-select').value));
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
    for (const id of Object.keys(api.drivers)) thumbnails[`driver-${id}`] = api.drivers[id].portrait ? `assets/portraits/${id}.png` : thumbnail(id, 'standard', true);
    for (const id of Object.keys(api.vehicles)) thumbnails[`vehicle-${id}`] = thumbnail('mario', id, false);
    for (const part of ['tire', 'glider']) for (const id of Object.keys(parts[part])) thumbnails[`${part}-${id}`] = thumbnail('mario', 'standard', false, part, id);
    function courseThumbnail(id) {
      if(thumbnails[`course-${id}`]) return thumbnails[`course-${id}`];
      const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio();renderer.setPixelRatio(1);
      const track = api.createTrack(T, id), view = api.createScene(T, renderer, track, garage.state);
      const simulation = api.createSimulation(track), p = track.points[36];
      Object.assign(simulation.state, { x: p.x, z: p.z, yaw: Math.atan2(p.tx, p.tz) });
      view.update(simulation.state, 0, false, true);
      view.camera.aspect = 2; view.camera.position.y += 3; view.camera.updateProjectionMatrix();
      renderer.setSize(512, 256, false); renderer.render(view.scene, view.camera);
      thumbnails[`course-${id}`] = renderer.domElement.toDataURL('image/jpeg', .88);
      api.disposeObject(view.scene);
      renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
      return thumbnails[`course-${id}`];
    }
    renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false);
    function wallet() {
      $('wallet').textContent = garage.state.coins;
      $('save-status').textContent = garage.available ? '' : 'Stockage indisponible : tes pièces et décorations sont conservés uniquement pour cette session.';
    }
    function show(next) {
      screen = next; garage.read(); onPreviewPaint(garage.state.paint);
      document.body.dataset.menu = screen;
      $('home').hidden = screen !== 'home'; $('garage-panel').hidden = screen === 'home'; document.body.classList.toggle('selecting', screen !== 'home');
      if (screen === 'shop') shopSelection = garage.state.paint;
      if (screen === 'course') activeCup=api.courses[garage.state.course].cup;
      $('cup-picker').hidden=screen!=='course';
      $('cup-medals').hidden=screen!=='course';
      $('shop-status').textContent = ''; render();
    }
    function render() {
      wallet(); const state = garage.state;
      $('current-choice').textContent = `${api.drivers[state.driver].name} · ${api.vehicles[state.vehicle].name} · ${api.tires[state.tire].name} · ${api.gliders[state.glider].name} · ${api.courses[state.course].name}`;
      if (screen === 'home') return;
      document.querySelectorAll('#category-tabs [data-screen]').forEach(button => button.classList.toggle('active', button.dataset.screen === screen));
      const labels = { driver: ['01 / PRÉPARER LA COURSE', 'CHOIX DU PILOTE'], vehicle: ['02 / PRÉPARER LA COURSE', 'PERSONNALISER LE KART'], course: ['03 / PRÉPARER LA COURSE', 'CHOIX DU CIRCUIT'], shop: ['DÉBLOCAGES PAR PIÈCES CUMULÉES', 'LES DÉCORATIONS'] };
      $('selection-step').textContent = labels[screen][0]; $('selection-title').textContent = labels[screen][1];
      $('cup-select').value=activeCup;
      document.querySelectorAll('[data-cup]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.cup)===activeCup)));
      const entries = { driver: api.drivers, vehicle: parts[activePart], course: Object.fromEntries(Object.entries(api.courses).filter(([,course])=>course.cup===activeCup)), shop: api.paints }[screen];
      const selected = screen === 'shop' ? shopSelection : state[screen === 'vehicle' ? activePart : screen];
      $('cards').replaceChildren();
      function appendCard(parent, field, id, item) {
        const chosen = screen === 'shop' ? shopSelection === id : state[field] === id;
        const card = document.createElement('button'); card.className = 'card'; card.dataset.choice = id; card.dataset.part = field; card.setAttribute('aria-pressed', String(chosen));
        card.setAttribute('aria-label', `${screen === 'vehicle' ? { vehicle: 'Kart', tire: 'Roues', glider: 'Aile' }[field] + ' : ' : ''}${item.name}`);
        if (screen === 'course') {
          const img = document.createElement('img'); img.src = courseThumbnail(id); img.alt = `Aperçu de ${item.name}`; card.append(img);
        }
        else if (screen === 'shop') { const sample = document.createElement('div'); sample.className = 'paint-sample'; sample.style.setProperty('--paint', item.color || api.vehicles[state.vehicle].color); const symbol = document.createElement('b'); symbol.textContent = 'MK'; sample.append(symbol); card.append(sample); }
        else { const img = document.createElement('img'); img.src = thumbnails[`${field}-${id}`]; img.alt = ''; card.append(img); }
        const label = document.createElement('span'); label.className = 'label'; label.textContent = item.name;
        const tag = document.createElement('small'); tag.textContent = screen === 'course' ? item.difficulty : screen === 'shop' ? state.owned.includes(id) ? 'DÉBLOQUÉ' : `${item.price} ◉ AU TOTAL` : chosen ? '✓' : '';
        label.append(tag); card.append(label); card.onclick = () => {
          if (screen === 'shop') { shopSelection = id; onPreviewPaint(id); }
          else { if (screen === 'vehicle') activePart = field; garage.select(field, id); onChange(field); }
          $('shop-status').textContent = ''; render();
          if (screen === 'vehicle' || screen === 'driver') { const selected=$('cards').querySelector(`[data-part=${field}][data-choice=${id}]`); selected.focus({preventScroll:true});if(screen==='driver')selected.scrollIntoView({block:'nearest'}); }
        }; parent.append(card);
      }
      if (screen === 'vehicle') {
        for (const [field, catalog] of Object.entries(parts)) {
          const column = document.createElement('section'); column.className = 'part-column';
          column.dataset.active=String(activePart===field);
          const label={vehicle:'Kart',tire:'Roues',glider:'Aile'}[field];
          const heading = document.createElement('h3'); heading.textContent=label.toUpperCase(); column.append(heading);
          const ids=Object.keys(catalog),reel=document.createElement('div');reel.className='part-reel';reel.setAttribute('aria-label',label);
          const change=id=>{activePart=field;garage.select(field,id);onChange(field);render();};
          for(const direction of [-1,1]) {
            const arrow=document.createElement('button');arrow.className='reel-arrow';arrow.textContent=direction<0?'▲':'▼';arrow.setAttribute('aria-label',`${label} ${direction<0?'précédent':'suivant'}`);
            arrow.onclick=()=>change(ids[(ids.indexOf(garage.state[field])+direction+ids.length)%ids.length]);
            if(direction<0)column.append(arrow,reel);else column.append(arrow);
          }
          for (const [id, item] of Object.entries(catalog)) appendCard(reel, field, id, item);
          $('cards').append(column);
          const chosen=reel.querySelector('[aria-pressed=true]');reel.scrollTop=chosen.offsetTop-(reel.clientHeight-chosen.offsetHeight)/2;
          let timer,dragging=false;
          function settle(){clearTimeout(timer);timer=setTimeout(()=>{
            if(!reel.isConnected||dragging||screen!=='vehicle')return;
            const center=reel.scrollTop+reel.clientHeight/2;
            const closest=[...reel.children].reduce((a,b)=>Math.abs(a.offsetTop+a.offsetHeight/2-center)<Math.abs(b.offsetTop+b.offsetHeight/2-center)?a:b);
            if(closest.dataset.choice!==garage.state[field])change(closest.dataset.choice);
          },160);}
          reel.addEventListener('scroll',settle);reel.addEventListener('pointerdown',()=>{dragging=true;});
          for(const event of ['pointerup','pointercancel','lostpointercapture'])reel.addEventListener(event,()=>{dragging=false;settle();});
        }
      } else {
        for (const [id, item] of Object.entries(entries)) appendCard($('cards'), screen, id, item);
      }
      const item = entries[selected]; $('detail-name').textContent = item.name;
      $('menu-selection').textContent = screen==='course'?api.cups[activeCup]:item.name;
      $('detail-description').textContent = screen === 'shop' ? 'Les pièces cumulées débloquent automatiquement les couleurs et les motifs. Équipe-les gratuitement : ton total ne diminue jamais.' : item.description;
      if (screen === 'vehicle' && activePart === 'glider') $('detail-description').textContent += ' S’ouvre en vol après une rampe bleue.';
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
        $('continue').textContent = equipped ? 'DÉCORATION ÉQUIPÉE ✓' : owned ? 'ÉQUIPER GRATUITEMENT' : `PALIER · ${item.price} PIÈCES`;
        $('continue').disabled = equipped || !owned;
        $('continue').setAttribute('aria-label', $('continue').textContent);
        const next=Object.values(api.paints).find(paint=>paint.price>state.coins);
        $('shop-status').textContent = !owned ? `Encore ${item.price-state.coins} pièces pour débloquer cette décoration.` : next ? `Prochain déblocage : ${next.name}, à ${next.price} pièces.` : 'Toutes les décorations sont débloquées !';
      }
    }
    document.querySelectorAll('[data-screen]').forEach(button => { button.onclick = () => show(button.dataset.screen); });
    $('play').onclick = () => show('driver'); $('start').onclick = onPlay;
    $('menu-back').onclick = () => show({ driver: 'home', vehicle: 'driver', course: 'vehicle', shop: 'home' }[screen]);
    $('continue').onclick = () => {
      if (screen === 'shop') {
        const success = garage.select('paint', shopSelection);
        if (success) onChange('paint'); render();
        $('shop-status').textContent = success ? 'Décoration équipée ! Tu conserves toutes tes pièces.' : 'Cette décoration n’est pas encore débloquée.';
      } else show(screen === 'driver' ? 'vehicle' : 'course');
    };
    $('play').disabled = false; $('play').textContent = '⚑ JOUER'; $('start').disabled = false;
    show('home');
    return { show, render, wallet, portrait(id){return thumbnails[`driver-${id}`];}, get screen() { return screen; } };
  };
})();
