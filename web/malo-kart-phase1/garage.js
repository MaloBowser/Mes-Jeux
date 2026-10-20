(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.drivers = {
    mario: { name: 'Mario', color: '#e83232', guest: true, description: 'Casquette rouge, moustache et salopette bleue.' },
    luigi: { name: 'Luigi', color: '#30a849', guest: true, description: 'La casquette verte et une silhouette élancée.' },
    peach: { name: 'Peach', color: '#fa85bd', guest: true, description: 'Une couronne dorée et une tenue rose.' },
    daisy: { name: 'Daisy', color: '#ffae22', guest: true, description: 'Une princesse en orange, toujours prête à courir.' },
    yoshi: { name: 'Yoshi', color: '#58bf43', guest: true, description: 'Le dinosaure vert au grand museau.' },
    toad: { name: 'Toad', color: '#2772e3', guest: true, description: 'Un grand chapeau champignon à pois rouges.' },
    koopa: { name: 'Koopa', color: '#f6bf39', guest: true, description: 'Une carapace verte et un sourire de tortue.' },
    shyguy: { name: 'Maskass', color: '#df3542', guest: true, description: 'Une capuche rouge et un masque blanc.' },
    bowser: { name: 'Bowser', color: '#dfab2c', guest: true, description: 'Cornes, crinière rousse et carapace à pointes.' },
    wario: { name: 'Wario', color: '#f6d42a', guest: true, description: 'Casquette jaune et salopette violette.' },
    waluigi: { name: 'Waluigi', color: '#8644bf', guest: true, description: 'Une silhouette fine et une casquette violette.' },
    rosalina: { name: 'Harmonie', color: '#63d5d4', guest: true, description: 'Une tenue turquoise et une chevelure blonde.' },
    malo: { name: 'Malo', color: '#248eea', description: 'Le pilote à la casquette bleue. Toujours prêt au départ.' },
    nova: { name: 'Nova', color: '#c15dff', description: 'Une exploratrice aux cheveux violets et au bandeau turquoise.' },
    rocky: { name: 'Rocky', color: '#ed8542', description: 'Un renard aventurier, de grandes oreilles et un sourire malicieux.' },
    zephyr: { name: 'Zéphyr', color: '#45ddbc', description: 'Un petit robot curieux, deux antennes et un regard lumineux.' }
  };
  api.vehicles = {
    standard: { name: 'Standard', description: 'Un kart équilibré pour apprendre chaque virage.', speed: 34, acceleration: 13, handling: 1, weight: 1, color: '#218bd8' },
    turbo: { name: 'Turbo', description: 'Plus rapide et plus lourd. Anticipe tes freinages.', speed: 41, acceleration: 11, handling: .84, weight: 1.4, color: '#ef4656' },
    compact: { name: 'Compact', description: 'Léger, nerveux et facile à placer dans les courbes.', speed: 30, acceleration: 17, handling: 1.22, weight: .75, color: '#f5bd36' }
  };
  api.courses = {
    azur: { name: 'Circuit Azur', difficulty: 'FACILE', description: 'Bord de mer, grandes courbes et ciel bleu.', sky: '#77c9ef', fog: '#b1dbe5', ground: '#83b66b', outer: '#259fae', tree: '#3e9574', accent: '#13a5b1' },
    neon: { name: 'Forêt Néon', difficulty: 'TECHNIQUE', description: 'Slalom nocturne entre les sapins et les portes lumineuses.', sky: '#111c35', fog: '#1d3454', ground: '#183b3d', outer: '#102331', tree: '#317a79', accent: '#c952ff' },
    desert: { name: 'Désert Turbo', difficulty: 'INTERMÉDIAIRE', description: 'Longues lignes droites, cactus et rochers de grès.', sky: '#f0c28d', fog: '#e0bb9a', ground: '#dca76a', outer: '#cb9459', tree: '#65975b', accent: '#e76f36' }
  };
  api.paints = {
    original: { name: 'Couleur du véhicule', color: null, price: 0 },
    coral: { name: 'Corail', color: '#ff7059', price: 20 },
    mint: { name: 'Menthe', color: '#44e1b5', price: 35 },
    violet: { name: 'Violet électrique', color: '#a659ef', price: 50 },
    gold: { name: 'Or de champion', color: '#ffc950', price: 80 }
  };
  api.createGarage = () => {
    let key = 'malo-kart-garage-v1', available = true;
    try { const profile = localStorage.getItem('malo.activeProfile'); if (profile) key = `malo.profileData.${profile}.${key}`; } catch (_) { available = false; }
    let state = { driver: 'mario', vehicle: 'standard', course: 'azur', paint: 'original', coins: 0, owned: ['original'], quality: 'auto' };
    function read() {
      try {
        const raw = localStorage.getItem(key), saved = raw ? JSON.parse(raw) : null;
        if (saved && typeof saved === 'object') {
          for (const [field, list] of [['driver', api.drivers], ['vehicle', api.vehicles], ['course', api.courses]]) if (Object.hasOwn(list, saved[field])) state[field] = saved[field];
          state.coins = Number.isFinite(saved.coins) ? Math.max(0, Math.min(100, Math.floor(saved.coins))) : 0;
          state.owned = ['original', ...(Array.isArray(saved.owned) ? saved.owned.filter(id => Object.hasOwn(api.paints, id) && id !== 'original') : [])];
          state.paint = state.owned.includes(saved.paint) ? saved.paint : 'original';
          state.quality = ['auto', 'high', 'low'].includes(saved.quality) ? saved.quality : 'auto';
        }
      } catch (_) { available = false; }
      return state;
    }
    function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { available = false; } }
    function select(field, id) {
      read();
      const list = { driver: api.drivers, vehicle: api.vehicles, course: api.courses, paint: api.paints }[field];
      if (!list || !Object.hasOwn(list, id) || field === 'paint' && !state.owned.includes(id)) return false;
      state[field] = id; save(); return true;
    }
    function buy(id) {
      read(); const paint = Object.hasOwn(api.paints, id) ? api.paints[id] : null;
      if (!paint || state.owned.includes(id) || state.coins < paint.price) return false;
      state.coins -= paint.price; state.owned.push(id); state.paint = id; save(); return true;
    }
    function credit(amount) {
      read(); const earned = Math.min(100 - state.coins, Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0)));
      state.coins += earned; if (earned) save(); return earned;
    }
    read();
    return { get state() { return state; }, get available() { return available; }, read, select, buy, credit,
      quality(value) { read(); if (['auto', 'high', 'low'].includes(value)) { state.quality = value; save(); } } };
  };
  api.disposeObject = root => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(object => {
      if (object.shadow && object.shadow.map) object.shadow.map.dispose();
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
    });
    for (const mat of materials) { for (const value of Object.values(mat)) if (value && value.isTexture) textures.add(value); mat.dispose(); }
    textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose());
  };
})();
