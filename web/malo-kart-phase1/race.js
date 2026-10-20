(() => {
  'use strict';
  const api = window.MaloPrototype;
  api.items = {
    turbo: { name: 'Turbo', symbol: '»', hint: 'Une accélération pendant 2 secondes', color: '#ffbc48' },
    orb: { name: 'Orbe', symbol: '●', hint: 'Vise le kart devant toi à moins de 100 m', color: '#ed83ff' },
    shield: { name: 'Bouclier', symbol: '◇', hint: 'Absorbe une attaque pendant 6 secondes', color: '#67efff' },
    trap: { name: 'Piège', symbol: '▲', hint: 'Pose un obstacle derrière ton kart', color: '#ff7191' }
  };
  api.createRace = (track, simulation, choice, random = Math.random) => {
    const unit = track.length / track.points.length;
    const player = { id: 0, name: 'Toi', choice: { ...choice }, state: simulation.state };
    const rivals = ['luigi', 'peach', 'yoshi', 'bowser', 'toad'].map((driver, i) => ({
      id: i + 1, name: api.drivers[driver].name, lane: (i % 2 ? 1 : -1) * 2.5, pace: 25.2 + i * .75,
      choice: { driver, vehicle: ['compact', 'standard', 'turbo'][i % 3], paint: 'original' },
      state: {}
    }));
    const racers = [player, ...rivals], boxes = [], hazards = [], shots = [];
    for (let i = 32; i < 480; i += 80) for (const lane of [-4, 0, 4]) {
      const p = track.points[i];
      boxes.push({ x: p.x + p.tz * lane, z: p.z - p.tx * lane, cooldown: 0 });
    }
    let elapsed = 0, notice = '', noticeTime = 0;
    function announce(text) { notice = text; noticeTime = 2.2; }
    function position(distance, lane = 0) {
      const index = ((distance / unit) % 480 + 480) % 480, i = Math.floor(index), f = index - i;
      const a = track.points[i], b = track.points[(i + 1) % 480];
      return { x: a.x + (b.x - a.x) * f + a.tz * lane, z: a.z + (b.z - a.z) * f - a.tx * lane, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    function reset() {
      elapsed = noticeTime = 0; notice = ''; hazards.length = shots.length = 0;
      boxes.forEach(box => { box.cooldown = 0; });
      racers.forEach(racer => {
        racer.item = null; racer.reserveItem = null; racer.finishTime = null; racer.nextUse = 0;
        racer.progress = (racer.id ? 7 + Math.floor((racer.id - 1) / 2) * 4 : 3) * unit;
        if (racer.id) Object.assign(racer.state, position(racer.progress, racer.lane), { speed: 0, boost: 0, shield: 0, stun: 0, grace: 0, finished: false });
      });
    }
    function standings() {
      return [...racers].sort((a, b) => {
        if (a.finishTime !== null || b.finishTime !== null) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity) || a.id - b.id;
        return b.progress - a.progress || a.id - b.id;
      });
    }
    function hit(racer) {
      const s = racer.state;
      if (s.finished || s.grace > 0) return;
      if (s.shield > 0) {
        s.shield = 0; s.grace = .6;
        if (racer === player) announce('BOUCLIER · Attaque bloquée !');
        return;
      }
      s.stun = 1; s.grace = 2; s.boost = 0; s.speed *= .45;
      if (racer === player) { s.vx *= .45; s.vz *= .45; announce('TOUCHÉ ! Reprends de la vitesse'); }
    }
    function useItem(racer = player) {
      if (!racer.item || racer.state.finished) return false;
      const item = racer.item, s = racer.state;
      if (item === 'orb') {
        const target = racers.filter(other => other !== racer && !other.state.finished && other.progress > racer.progress && other.progress - racer.progress < 100)
          .sort((a, b) => a.progress - b.progress)[0];
        if (!target) { if (racer === player) announce('ORBE · Aucun adversaire à portée devant toi'); return false; }
        shots.push({ x: s.x, z: s.z, target, owner: racer.id, ttl: 3 });
      } else if (item === 'turbo') s.boost = 2;
      else if (item === 'shield') s.shield = 6;
      else if (item === 'trap') hazards.push({ x: s.x - Math.sin(s.yaw) * 3, z: s.z - Math.cos(s.yaw) * 3, owner: racer.id, ttl: 14 });
      racer.item = racer.reserveItem; racer.reserveItem = null;
      if (racer === player) announce(`${api.items[item].name.toUpperCase()} !`);
      return true;
    }
    function updateRival(racer, dt) {
      const s = racer.state;
      if (s.finished) return;
      for (const effect of ['boost', 'shield', 'stun', 'grace']) s[effect] = Math.max(0, s[effect] - dt);
      const here = position(racer.progress), ahead = position(racer.progress + 14);
      const bend = Math.abs(Math.atan2(Math.sin(ahead.yaw - here.yaw), Math.cos(ahead.yaw - here.yaw)));
      const targetSpeed = racer.pace * Math.max(.68, 1 - bend * .65) * (s.boost > 0 ? 1.35 : 1) * (s.stun > 0 ? .22 : 1);
      s.speed += Math.max(-22 * dt, Math.min(11 * dt, targetSpeed - s.speed));
      racer.progress = Math.min(track.length * 2, racer.progress + s.speed * dt);
      Object.assign(s, position(racer.progress, racer.lane + Math.sin(elapsed * .7 + racer.id) * .6));
      if (racer.progress >= track.length * 2) { racer.finishTime = elapsed; s.finished = true; s.speed = 0; }
      if (racer.item && elapsed >= racer.nextUse) { useItem(racer); racer.nextUse = elapsed + 2; }
    }
    function updatePlayer() {
      const s = player.state, nearest = api.nearestPoint(track.points, s.x, s.z), a = track.points[nearest.index];
      const distance = nearest.index * unit + Math.hypot(nearest.x - a.x, nearest.z - a.z);
      const gate = s.nextGate || 8;
      player.progress = s.finished ? track.length * 2 : s.laps * track.length + Math.max((gate - 1) * 60 * unit, Math.min(gate * 60 * unit, distance));
      if (s.finished && player.finishTime === null) player.finishTime = elapsed;
    }
    function step(dt) {
      elapsed += dt; noticeTime = Math.max(0, noticeTime - dt);
      rivals.forEach(racer => updateRival(racer, dt)); updatePlayer();
      for (const box of boxes) {
        box.cooldown = Math.max(0, box.cooldown - dt);
        if (box.cooldown > 0) continue;
        for (const racer of racers) {
          if (racer.reserveItem || racer.state.finished || Math.hypot(racer.state.x - box.x, racer.state.z - box.z) > 1.9) continue;
          const pool = standings().indexOf(racer) >= 3 ? ['turbo', 'turbo', 'orb', 'shield', 'trap'] : ['turbo', 'orb', 'shield', 'trap'];
          const item = pool[Math.floor(random() * pool.length)];
          if (racer.item) racer.reserveItem = item;
          else { racer.item = item; racer.nextUse = elapsed + 1.5; }
          box.cooldown = 4;
          if (racer === player) announce(`${api.items[item].name.toUpperCase()} · ${racer.reserveItem ? 'En réserve' : 'Appuie sur E'}`);
          break;
        }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const shot = shots[i], target = shot.target.state;
        const dx = target.x - shot.x, dz = target.z - shot.z, distance = Math.hypot(dx, dz);
        shot.ttl -= dt;
        if (!target.finished && distance < 1.4 + 58 * dt) { hit(shot.target); shot.ttl = 0; }
        else if (distance > 0) { shot.x += dx / distance * 58 * dt; shot.z += dz / distance * 58 * dt; }
        if (shot.ttl <= 0 || target.finished) shots.splice(i, 1);
      }
      for (let i = hazards.length - 1; i >= 0; i--) {
        const hazard = hazards[i]; hazard.ttl -= dt;
        for (const racer of racers) {
          if (racer.id !== hazard.owner && !racer.state.finished && Math.hypot(racer.state.x - hazard.x, racer.state.z - hazard.z) < 1.5) {
            hit(racer); hazard.ttl = 0; break;
          }
        }
        if (hazard.ttl <= 0) hazards.splice(i, 1);
      }
      for (const rival of rivals) {
        const s = player.state, other = rival.state;
        if (s.finished || other.finished || s.grace > 0 || Math.hypot(s.x - other.x, s.z - other.z) >= 1.8) continue;
        s.vx *= .82; s.vz *= .82; s.speed *= .82; s.grace = .8;
        other.speed *= .85;
      }
    }
    reset();
    return { player, rivals, racers, boxes, hazards, shots, reset, step, useItem, standings,
      get elapsed() { return elapsed; }, get notice() { return noticeTime > 0 ? notice : ''; } };
  };
})();
