/* Simulation indépendante du rendu : mètres, secondes, radians. */
(() => {
  'use strict';
  const api = window.MaloPrototype = {};
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  api.nearestPoint = (points, x, z) => {
    let best = { distance: Infinity };
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length * length), 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t, distance = Math.hypot(x - px, z - pz);
      if (distance < best.distance) best = { x: px, z: pz, distance, tx: dx / length, tz: dz / length, index: i };
    }
    return best;
  };
  api.createSimulation = (track, vehicle = { speed: 34, acceleration: 13, handling: 1, weight: 1 }) => {
    const state = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0, laps: 0, nextGate: 1, finished: false, drift: false, impact: 0 };
    function reset() {
      const start = track.points[3], next = track.points[4];
      Object.assign(state, { x: start.x, z: start.z, yaw: Math.atan2(next.x - start.x, next.z - start.z), vx: 0, vz: 0, speed: 0, laps: 0, nextGate: 1, finished: false, drift: false, impact: 0 });
    }
    function checkGate(previous) {
      const gate = track.gates[state.nextGate];
      const before = (previous.x - gate.x) * gate.tx + (previous.z - gate.z) * gate.tz;
      const after = (state.x - gate.x) * gate.tx + (state.z - gate.z) * gate.tz;
      if (before >= 0 || after < 0) return;
      const t = -before / (after - before);
      const x = previous.x + (state.x - previous.x) * t, z = previous.z + (state.z - previous.z) * t;
      if (Math.abs((x - gate.x) * gate.tz - (z - gate.z) * gate.tx) > track.halfWidth - 1.2) return;
      if (state.nextGate === 0) {
        state.laps++;
        if (state.laps === 2) { state.finished = true; state.vx = state.vz = state.speed = 0; }
      }
      state.nextGate = (state.nextGate + 1) % track.gates.length;
    }
    function step(dt, input) {
      if (state.finished) return;
      const previous = { x: state.x, z: state.z };
      state.impact = Math.max(0, state.impact - dt);
      const steering = Number(!!input.left) - Number(!!input.right);
      state.drift = !!input.drift && steering !== 0 && state.speed > 8;
      const steerAngle = steering * .46 * vehicle.handling / (1 + state.speed * .12);
      state.yaw += state.speed / 2.1 * Math.tan(steerAngle) * dt * (state.drift ? 1.22 : 1);
      const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw);
      let forward = state.vx * fx + state.vz * fz;
      const lateral = (state.vx * fz - state.vz * fx) * Math.exp(-(state.drift ? 2.4 : 10) * dt);
      forward += ((input.gas ? vehicle.acceleration : 0) - (input.brake ? 27 / Math.sqrt(vehicle.weight) : 0) - .7 - .004 * forward * forward) * dt;
      forward = clamp(forward, 0, vehicle.speed);
      state.vx = fx * forward + fz * lateral;
      state.vz = fz * forward - fx * lateral;
      state.x += state.vx * dt; state.z += state.vz * dt;
      const nearest = api.nearestPoint(track.points, state.x, state.z);
      const limit = track.halfWidth - 1.25;
      if (nearest.distance > limit) {
        const nx = (state.x - nearest.x) / nearest.distance, nz = (state.z - nearest.z) / nearest.distance;
        state.x = nearest.x + nx * limit; state.z = nearest.z + nz * limit;
        const outward = state.vx * nx + state.vz * nz;
        if (outward > 0) {
          state.vx -= outward * nx; state.vz -= outward * nz;
          if (state.impact === 0) { const retention = .65 + (vehicle.weight - 1) * .12; state.vx *= retention; state.vz *= retention; }
          state.impact = .3;
        }
      }
      state.speed = Math.hypot(state.vx, state.vz);
      checkGate(previous);
    }
    reset();
    return { state, step, reset };
  };
})();
