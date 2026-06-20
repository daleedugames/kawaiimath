class ResultScene {
  constructor(game, win) {
    this.game = game;
    this.win = win;
    this.anim = 0;
    this.particles = [];
    if (win) {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: 400 + Math.random() * 200 - 100,
          y: 250 + Math.random() * 100 - 50,
          vx: Math.cos(angle) * (60 + Math.random() * 120),
          vy: Math.sin(angle) * (60 + Math.random() * 120) - 80,
          life: 1.5, maxLife: 1.5,
          color: ['#FFD700','#FF69B4','#00CED1','#90EE90'][Math.floor(Math.random()*4)],
          r: 5 + Math.random() * 8,
          emoji: ['⭐','🌸','✨','💫'][Math.floor(Math.random()*4)]
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
      // reset for replay
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

    // dimmed background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.font = `${Math.round(p.r * 2.5)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // card
    const cardW = 480, cardH = 280;
    const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
    ctx.fillStyle = this.win ? '#1a0033' : '#330000';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = this.win ? world.accentColor : '#ff4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';

    if (this.win) {
      const worldDone = this.game.state.currentLevel >= 10;
      const allDone = worldDone && this.game.state.currentWorld >= 4;
      const pulse = 1 + 0.05 * Math.sin(this.anim * 4);
      ctx.save();
      ctx.translate(W/2, cardY + 80);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText(allDone ? '🎉 YOU WIN! 🎉' : worldDone ? '🌟 World Complete! 🌟' : '✨ Level Clear! ✨', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(allDone
        ? "You're a Math Master! Amazing!"
        : worldDone
        ? `${WORLDS[this.game.state.currentWorld + 1]?.name ?? 'All worlds'} unlocked!`
        : `Next up: Level ${this.game.state.currentLevel + 1}`, W/2, cardY + 145);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = world.accentColor;
      ctx.fillText(`⭐ Stars collected: ${this.game.state.stars}`, W/2, cardY + 185);
    } else {
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#ff6666';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.fillText('💔 Oh No! 💔', W/2, cardY + 90);
      ctx.shadowBlur = 0;

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#ffaaaa';
      ctx.fillText('Out of lives! Try again?', W/2, cardY + 145);

      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#ff9999';
      ctx.fillText(`Equation: ${generateEquation(this.game.state.currentWorld, this.game.state.currentLevel - 1 < 0 ? 0 : this.game.state.currentLevel).display}`, W/2, cardY + 185);
    }

    // press space hint
    const blink = Math.sin(this.anim * 3) > 0;
    if (blink) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press Space to continue', W/2, cardY + cardH - 28);
    }
  }
}
