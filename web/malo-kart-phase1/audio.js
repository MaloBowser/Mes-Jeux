(() => {
  'use strict';
  window.MaloPrototype.createAudio = () => {
    let context, engine, engineGain, enabled = true;
    const effects = new Set();
    const sounds = {
      countdown: [440], go: [660, 880], coin: [1100, 1500], pickup: [520, 780, 1040],
      turbo: [180, 300, 520], orb: [900, 600], shield: [650, 980],
      trap: [250, 150], hit: [95, 60], finish: [523, 659, 784, 1047]
    };
    function unlock() {
      if (!enabled) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        if (!context) {
          context = new AudioContext();
          engine = context.createOscillator(); engineGain = context.createGain();
          const filter = context.createBiquadFilter();
          filter.type = 'lowpass'; filter.frequency.value = 420;
          engine.type = 'sawtooth'; engine.frequency.value = 40; engineGain.gain.value = 0;
          engine.connect(filter); filter.connect(engineGain); engineGain.connect(context.destination);
          engine.start();
        }
        context.resume().catch(() => {});
      } catch (_) {
        if (context) context.close().catch(() => {});
        context = null;
      }
    }
    function play(name) {
      if (!enabled || !context) return;
      const notes = sounds[name];
      if (!notes) return;
      notes.forEach((frequency, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = context.currentTime + i * .09, duration = name === 'finish' ? .25 : .13;
        oscillator.type = name === 'hit' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * .8, start + duration);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.065, start + .01);
        gain.gain.exponentialRampToValueAtTime(.001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        effects.add(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); effects.delete(oscillator); };
        oscillator.start(start); oscillator.stop(start + duration);
      });
    }
    function silence() {
      if (!context) return;
      engineGain.gain.cancelScheduledValues(context.currentTime);
      engineGain.gain.setValueAtTime(0, context.currentTime);
      for (const oscillator of effects) oscillator.stop();
      effects.clear();
    }
    function update(state, driving) {
      if (!context) return;
      engine.frequency.setTargetAtTime(40 + state.speed * 2.7 + (state.boost > 0 ? 35 : 0), context.currentTime, .08);
      engineGain.gain.setTargetAtTime(enabled && driving ? .035 + Math.min(state.speed / 1500, .03) : 0, context.currentTime, .04);
    }
    return { unlock, play, silence, update,
      setEnabled(value) { enabled = value; if (enabled) unlock(); else silence(); } };
  };
})();
