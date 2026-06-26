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
      beep(440, 'sine', 0.25, 0.08);
      beep(528, 'sine', 0.25, 0.08, 0.12);
      beep(660, 'sine', 0.35, 0.09, 0.24);
    },
    startMusic(worldIndex) {
      this.stopMusic();
      const ac = getCtx();
      const scales = [
        [261.6, 293.7, 329.6, 392, 440],
        [220, 246.9, 261.6, 293.7, 329.6],
        [392, 440, 493.9, 523.3, 587.3],
        [174.6, 196, 220, 261.6, 293.7],
        [293.7, 329.6, 369.9, 415.3, 466.2]
      ];
      const scale = scales[worldIndex] || scales[0];
      const pattern = [0, 2, 4, 2, 1, 3, 4, 3];
      const tempo = 0.35;
      const loopLen = pattern.length * tempo;
      const stopFlag = { active: true };
      musicNodes.push(stopFlag);

      const playLoop = (startTime) => {
        if (!stopFlag.active) return;
        pattern.forEach((noteIdx, i) => {
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.connect(g);
          g.connect(ac.destination);
          osc.type = 'square';
          osc.frequency.value = scale[noteIdx];
          g.gain.value = 0;
          const t = startTime + i * tempo;
          g.gain.setValueAtTime(0.06, t);
          g.gain.setValueAtTime(0, t + tempo * 0.7);
          osc.start(t);
          osc.stop(t + tempo);
          musicNodes.push({ osc, g });
        });
        const nextLoop = startTime + loopLen;
        const delay = (nextLoop - ac.currentTime) * 1000 - 100;
        setTimeout(() => playLoop(nextLoop), Math.max(0, delay));
      };

      playLoop(ac.currentTime);
    },
    stopMusic() {
      musicNodes.forEach(n => {
        if (n.active !== undefined) { n.active = false; return; }
        try { n.osc.stop(); } catch(e) {}
      });
      musicNodes = [];
    }
  };
})();
