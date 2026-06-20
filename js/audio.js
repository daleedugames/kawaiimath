window.Audio = (() => {
  let ctx = null;
  let musicNodes = [];

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq, type, duration, gain = 0.3, delay = 0) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gainNode.gain.setValueAtTime(gain, ac.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  }

  const noteFreqs = { C4:261.6, D4:293.7, E4:329.6, G4:392, A4:440, C5:523.3, D5:587.3, E5:659.3, G5:784 };

  return {
    jump()    { beep(400, 'square', 0.12, 0.2); beep(600, 'square', 0.08, 0.15, 0.05); },
    stomp()   { beep(200, 'square', 0.1, 0.3); beep(150, 'square', 0.15, 0.25, 0.08); },
    wrong()   { beep(180, 'sawtooth', 0.3, 0.4); beep(150, 'sawtooth', 0.3, 0.3, 0.15); },
    lifeLost(){ beep(300, 'sawtooth', 0.2, 0.3); beep(200, 'sawtooth', 0.3, 0.3, 0.1); beep(150, 'sawtooth', 0.4, 0.35, 0.25); },
    correct() {
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 'square', 0.15, 0.3, i * 0.07));
    },
    startMusic(worldIndex) {
      this.stopMusic();
      const ac = getCtx();
      const scales = [
        [261.6, 293.7, 329.6, 392, 440],   // C major (candy)
        [220, 246.9, 261.6, 293.7, 329.6], // A minor (ocean)
        [392, 440, 493.9, 523.3, 587.3],   // G major (star)
        [174.6, 196, 220, 261.6, 293.7],   // F major (forest)
        [293.7, 329.6, 369.9, 415.3, 466.2] // D phrygian (castle)
      ];
      const scale = scales[worldIndex] || scales[0];
      const pattern = [0, 2, 4, 2, 1, 3, 4, 3];
      const tempo = 0.35;
      pattern.forEach((noteIdx, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g);
        g.connect(ac.destination);
        osc.type = 'square';
        osc.frequency.value = scale[noteIdx];
        g.gain.value = 0;
        osc.start();
        // pulse on/off in pattern loop
        const loopLen = pattern.length * tempo;
        for (let rep = 0; rep < 60; rep++) {
          const t = ac.currentTime + rep * loopLen + i * tempo;
          g.gain.setValueAtTime(0.06, t);
          g.gain.setValueAtTime(0, t + tempo * 0.7);
        }
        musicNodes.push({ osc, g });
      });
    },
    stopMusic() {
      musicNodes.forEach(({ osc }) => { try { osc.stop(); } catch(e) {} });
      musicNodes = [];
    }
  };
})();
