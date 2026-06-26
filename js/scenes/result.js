class ResultScene {
  constructor(game, win) {
    this.game = game;
    this.win = win;
    this.anim = 0;
    this.particles = [];
    this.starsEarned = 0;
    this.starsBest = 0;
    if (win) {
      const w = game.state.currentWorld;
      const l = game.state.currentLevel - 1; // currentLevel was already incremented in _levelComplete
      const elapsed = (Date.now() - game.state.levelStartTime) / 1000;
      const timeTarget = (l % 5 === 4) ? 50 : 45;
      const livesLost = game.state.livesLostThisLevel;
      this.starsEarned = 1;
      if (livesLost === 0) this.starsEarned = 2;
      if (livesLost === 0 && elapsed <= timeTarget) this.starsEarned = 3;

      const key = `${w}_${l}`;
      this.starsBest = (game.state.levelStars[key] || 0);
      const newBest = Math.max(this.starsBest, this.starsEarned);
      game.state.levelStars[key] = newBest;
      window.Save && window.Save.save(game.state);
    }
    if (win) {
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: 400 + Math.random() * 200 - 100,
          y: 250 + Math.random() * 100 - 50,
          vx: Math.cos(angle) * (60 + Math.random() * 140),
          vy: Math.sin(angle) * (60 + Math.random() * 140) - 90,
          life: 1.8, maxLife: 1.8,
          color: ['#FFD700','#FF69B4','#00CED1','#90EE90'][Math.floor(Math.random()*4)],
          r: 5 + Math.random() * 8,
          emoji: ['⭐','🌸','✨','💫','🎀','💖'][Math.floor(Math.random()*6)]
        });
      }
    }
  }

  update(dt) {
    this.anim += dt;
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 150 * dt; p.life -= dt;
      return p.life > 0;
    });
  }

  onInput(code, type) {
    if (type !== 'down') return;
    if (code === 'Space' || code === 'Enter') this._continue();
  }

  _continue() {
    const s = this.game.state;
    if (!this.win) {
      s.lives = 3;
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new LevelScene(this.game));
      return;
    }
    const worldDone = s.currentLevel >= 10;
    const allDone = worldDone && s.currentWorld >= 4;
    if (allDone) {
      s.currentWorld = 0; s.currentLevel = 0; s.lives = 3;
      Audio.stopMusic();
      this.game.switchScene(new WorldMapScene(this.game));
    } else if (worldDone) {
      s.currentWorld++;
      s.currentLevel = 0;
      s.lives = 3;
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new WorldMapScene(this.game));
    } else {
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new LevelScene(this.game));
    }
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;
    const world = WORLDS[this.game.state.currentWorld];
    const accentC = this.win ? world.accentColor : '#ff6666';

    // Dimmed backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.font = `${Math.round(p.r * 2.5)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // Card base
    const cardW = 480, cardH = 320;
    const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;

    // Card shadow
    ctx.shadowColor = accentC;
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 22);
    ctx.fillStyle = this.win ? '#0e0030' : '#1a0000';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Card border
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, accentC + 'ff');
    borderGrad.addColorStop(0.5, accentC + 'aa');
    borderGrad.addColorStop(1, accentC + 'ff');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 22);
    ctx.stroke();

    // Inner top highlight
    ctx.beginPath();
    ctx.roundRect(cardX + 12, cardY + 8, cardW - 24, 10, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();

    ctx.textAlign = 'center';

    if (this.win) {
      const worldDone = this.game.state.currentLevel >= 10;
      const allDone = worldDone && this.game.state.currentWorld >= 4;
      const pulse = 1 + 0.05 * Math.sin(this.anim * 4);

      // Main heading
      ctx.save();
      ctx.translate(W / 2, cardY + 72);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 40px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24;
      ctx.fillText(allDone ? '🎉 YOU WIN! 🎉' : worldDone ? '🌟 World Clear! 🌟' : '✨ Level Clear! ✨', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Subtitle
      ctx.font = 'bold 18px "Nunito", sans-serif';
      ctx.fillStyle = '#ddd';
      ctx.fillText(allDone
        ? "You're a Maths Master! Amazing!"
        : worldDone
        ? `${WORLDS[this.game.state.currentWorld + 1]?.name ?? 'All worlds'} unlocked!`
        : `Next up: Level ${this.game.state.currentLevel + 1}`,
        W / 2, cardY + 108);

      // World name stripe
      ctx.font = '13px "Nunito", sans-serif';
      ctx.fillStyle = world.accentColor + 'cc';
      ctx.fillText(`${world.emoji} ${world.name}`, W / 2, cardY + 130);

      // Star rating
      const starY = cardY + 190;
      const starSize = 36;
      for (let i = 0; i < 3; i++) {
        ctx.font = `${starSize}px serif`;
        ctx.globalAlpha = i < this.starsEarned ? 1 : 0.18;
        if (i < this.starsEarned) {
          ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
        }
        ctx.fillText('⭐', W / 2 - 46 + i * 46, starY);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Best / new best
      if (this.starsEarned > this.starsBest) {
        ctx.font = 'bold 15px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
        ctx.fillText('✦ New Best! ✦', W / 2, starY + 32);
        ctx.shadowBlur = 0;
      } else {
        ctx.font = '13px "Nunito", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Best: ${'⭐'.repeat(this.starsBest) || '—'}`, W / 2, starY + 32);
      }

      // Stars collected
      ctx.font = 'bold 16px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
      ctx.fillStyle = world.accentColor;
      ctx.fillText(`⭐ Stars collected: ${this.game.state.stars}`, W / 2, starY + 58);

    } else {
      // Lose card
      const pulse = 1 + 0.04 * Math.sin(this.anim * 3);
      ctx.save();
      ctx.translate(W / 2, cardY + 90);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 42px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
      ctx.fillStyle = '#ff6666';
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
      ctx.fillText('💔 Oh No! 💔', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.font = 'bold 20px "Nunito", sans-serif';
      ctx.fillStyle = '#ffaaaa';
      ctx.fillText('Out of lives! Try again?', W / 2, cardY + 140);

      ctx.font = '16px "Nunito", sans-serif';
      ctx.fillStyle = '#ff9999';
      ctx.fillText(`Equation: ${generateEquation(this.game.state.currentWorld, this.game.state.currentLevel).display}`, W / 2, cardY + 175);

      // Sad stars
      ctx.font = '28px serif';
      ctx.globalAlpha = 0.25;
      [W/2 - 46, W/2, W/2 + 46].forEach(sx => ctx.fillText('⭐', sx, cardY + 225));
      ctx.globalAlpha = 1;
    }

    // Press space hint — blinking
    const blink = Math.sin(this.anim * 3) > 0;
    ctx.globalAlpha = blink ? 1 : 0.45;
    ctx.font = '15px "Nunito", sans-serif';
    ctx.fillStyle = accentC;
    ctx.fillText('Press Space to continue', W / 2, cardY + cardH - 22);
    ctx.globalAlpha = 1;
  }
}
