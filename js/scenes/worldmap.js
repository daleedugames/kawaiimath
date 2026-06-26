class WorldMapScene {
  constructor(game) {
    this.game = game;
    this.selected = 0;
    this.anim = 0;
    this.floaters = this._initFloaters();
    if (window.Save) {
      const saved = window.Save.load();
      game.state.levelStars = saved.levelStars;
    }
  }

  _initFloaters() {
    const symbols = ['+', '−', '×', '÷', '?', '8', '3', '7', '⭐', '✦'];
    const items = [];
    for (let i = 0; i < 18; i++) {
      items.push({
        sym: symbols[i % symbols.length],
        x: Math.random() * 800,
        y: Math.random() * 500,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 12 - 6,
        size: 12 + Math.random() * 18,
        alpha: 0.08 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2
      });
    }
    return items;
  }

  update(dt) {
    this.anim += dt;
    for (const f of this.floaters) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -30) f.x = 830;
      if (f.x > 830) f.x = -30;
      if (f.y < -30) f.y = 530;
      if (f.y > 530) f.y = -30;
    }
  }

  onInput(code, type) {
    if (type !== 'down') return;
    if (code === 'ArrowRight' || code === 'KeyD') this.selected = Math.min(WORLDS.length - 1, this.selected + 1);
    if (code === 'ArrowLeft'  || code === 'KeyA') this.selected = Math.max(0, this.selected - 1);
    if (code === 'Space' || code === 'Enter') {
      this.game.state.currentWorld = this.selected;
      this.game.state.currentLevel = 0;
      this.game.state.lives = 3;
      Audio.startMusic(this.selected);
      if (typeof LevelScene !== 'undefined') this.game.switchScene(new LevelScene(this.game));
    }
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;

    // === BACKGROUND ===
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#06001a');
    bgGrad.addColorStop(0.5, '#0e0030');
    bgGrad.addColorStop(1, '#1a0040');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Star field
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % W;
      const sy = (i * 97.3) % (H * 0.85);
      const pulse = 0.4 + 0.6 * Math.sin(this.anim * 1.5 + i * 0.7);
      ctx.globalAlpha = 0.15 + pulse * 0.45;
      ctx.fillStyle = i % 5 === 0 ? '#ffb3e6' : i % 3 === 0 ? '#b3d9ff' : '#ffffff';
      const r = i % 7 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating math symbols
    for (const f of this.floaters) {
      ctx.globalAlpha = f.alpha * (0.7 + 0.3 * Math.sin(this.anim * 1.2 + f.phase));
      ctx.font = `bold ${f.size}px "Fredoka One", sans-serif`;
      ctx.fillStyle = '#cc88ff';
      ctx.textAlign = 'center';
      ctx.fillText(f.sym, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // === TITLE LOGO ===
    const titleY = 88;
    ctx.textAlign = 'center';
    ctx.font = 'bold 68px "Fredoka One", "Arial Rounded MT Bold", "Arial Black", sans-serif';

    // KAWAII — neon pink
    // Outer dark outline
    ctx.strokeStyle = '#1a0033';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.strokeText('KAWAII', W / 2, titleY);
    // White outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.strokeText('KAWAII', W / 2, titleY);
    // Pink fill + glow
    ctx.shadowColor = '#ff1493';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff69b4';
    ctx.fillText('KAWAII', W / 2, titleY);
    // second pass for extra brightness
    ctx.shadowBlur = 50;
    ctx.fillStyle = '#ff1493';
    ctx.fillText('KAWAII', W / 2, titleY);
    ctx.shadowBlur = 0;

    // MATHS — neon cyan
    const mathsY = titleY + 62;
    ctx.strokeStyle = '#001a1a';
    ctx.lineWidth = 14;
    ctx.strokeText('MATHS', W / 2, mathsY);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 7;
    ctx.strokeText('MATHS', W / 2, mathsY);
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#00e5c4';
    ctx.fillText('MATHS', W / 2, mathsY);
    ctx.shadowBlur = 50;
    ctx.fillStyle = '#00ffdd';
    ctx.fillText('MATHS', W / 2, mathsY);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = 'bold 14px "Nunito", "Arial Rounded MT Bold", sans-serif';
    ctx.fillStyle = '#e8c0ff';
    ctx.letterSpacing = '2px';
    ctx.fillText('✦  PLATFORM YOUR WAY TO SUMS & STARDOM  ✦', W / 2, mathsY + 26);

    // === WORLD NODES ===
    const nodeAreaY = 270;
    const spacing = W / (WORLDS.length + 1);

    // Path between nodes
    ctx.strokeStyle = '#6600cc44';
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    ctx.moveTo(spacing, nodeAreaY);
    ctx.lineTo(spacing * WORLDS.length, nodeAreaY);
    ctx.stroke();
    ctx.setLineDash([]);

    WORLDS.forEach((world, i) => {
      const nx = spacing * (i + 1);
      const isSelected = i === this.selected;
      const isUnlocked = i === 0 || this.game.state.worldProgress[i - 1] >= 10;
      const prog = this.game.state.worldProgress[i];
      const nodePulse = isSelected ? 1 + 0.06 * Math.sin(this.anim * 4) : 1;

      ctx.save();
      ctx.translate(nx, nodeAreaY);
      ctx.scale(nodePulse, nodePulse);

      if (isSelected) {
        // selection ring glow
        ctx.shadowColor = world.accentColor;
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.strokeStyle = world.accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Node background
      const ng = ctx.createRadialGradient(0, -5, 4, 0, 0, 36);
      ng.addColorStop(0, isUnlocked ? world.platformColor + 'ff' : '#333');
      ng.addColorStop(1, isUnlocked ? world.bgColor + 'cc' : '#1a1a1a');
      ctx.beginPath();
      ctx.arc(0, 0, isSelected ? 38 : 32, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.strokeStyle = isSelected ? world.accentColor : isUnlocked ? world.accentColor + '88' : '#444';
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.stroke();

      // Top highlight
      ctx.beginPath();
      ctx.ellipse(0, -14, 16, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();

      // Emoji
      ctx.font = `${isSelected ? 30 : 24}px serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = isUnlocked ? 1 : 0.35;
      ctx.fillText(world.emoji, 0, 10);
      ctx.globalAlpha = 1;

      // Lock
      if (!isUnlocked) {
        ctx.font = '20px serif';
        ctx.fillText('🔒', 0, -8);
      }

      ctx.restore();

      // World name
      ctx.font = `${isSelected ? 'bold 13px' : '12px'} "Nunito", sans-serif`;
      ctx.fillStyle = isUnlocked ? (isSelected ? world.accentColor : '#ddd') : '#555';
      ctx.textAlign = 'center';
      ctx.shadowColor = isSelected ? world.accentColor : 'transparent';
      ctx.shadowBlur = isSelected ? 8 : 0;
      ctx.fillText(world.name, nx, nodeAreaY + 52);
      ctx.shadowBlur = 0;

      // Progress
      ctx.font = '11px sans-serif';
      ctx.fillStyle = isUnlocked ? world.accentColor + 'cc' : '#444';
      ctx.fillText(`${prog}/10`, nx, nodeAreaY + 68);

      // Level star dots (10 levels)
      const dotStartX = nx - 45;
      for (let lvl = 0; lvl < 10; lvl++) {
        const stars = (this.game.state.levelStars || {})[`${i}_${lvl}`] || 0;
        ctx.font = '8px serif';
        ctx.globalAlpha = stars > 0 ? 1 : 0.2;
        ctx.fillText(stars >= 1 ? '⭐' : '·', dotStartX + lvl * 9, nodeAreaY + 84);
      }
      ctx.globalAlpha = 1;
    });

    // === SELECTED WORLD PREVIEW STRIP ===
    const selW = WORLDS[this.selected];
    const stripY = H - 68;
    const stripGrad = ctx.createLinearGradient(0, stripY, 0, stripY + 48);
    stripGrad.addColorStop(0, selW.bgColor + '00');
    stripGrad.addColorStop(0.3, selW.bgColor + 'cc');
    stripGrad.addColorStop(1, selW.bgColor + 'ff');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, stripY, W, 68);

    ctx.font = 'bold 15px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = selW.accentColor;
    ctx.shadowColor = selW.accentColor;
    ctx.shadowBlur = 10;
    ctx.fillText(`${selW.emoji}  ${selW.name.toUpperCase()}  —  ${selW.operation.toUpperCase()}`, W / 2, stripY + 22);
    ctx.shadowBlur = 0;

    // Controls hint
    const blink = Math.sin(this.anim * 3) > 0;
    ctx.globalAlpha = blink ? 1 : 0.5;
    ctx.font = '13px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('← → choose world   |   SPACE to play', W / 2, stripY + 46);
    ctx.globalAlpha = 1;

    // Stars / lives top-right
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`⭐ ${this.game.state.stars}`, W - 12, 20);
    ctx.fillStyle = '#ff69b4';
    ctx.fillText(`${'❤️'.repeat(this.game.state.lives)}`, W - 12, 38);
  }
}
