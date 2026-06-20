class WorldMapScene {
  constructor(game) {
    this.game = game;
    this.selected = 0;
    this.starAnim = 0;
  }

  update(dt) {
    this.starAnim += dt;
  }

  onInput(code, type) {
    if (type !== 'down') return;
    if (code === 'ArrowRight' || code === 'KeyD') {
      this.selected = Math.min(WORLDS.length - 1, this.selected + 1);
    }
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.selected = Math.max(0, this.selected - 1);
    }
    if (code === 'Space' || code === 'Enter') {
      this.game.state.currentWorld = this.selected;
      this.game.state.currentLevel = 0;
      this.game.state.lives = 3;
      Audio.startMusic(this.selected);
      if (typeof LevelScene !== 'undefined') {
        this.game.switchScene(new LevelScene(this.game));
      } else {
        console.log('LevelScene not yet built — world selected:', this.selected);
      }
    }
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d0020');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // twinkling stars background
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 50) % W);
      const sy = ((i * 97 + 30) % (H * 0.6));
      const pulse = 0.5 + 0.5 * Math.sin(this.starAnim * 2 + i);
      ctx.globalAlpha = 0.3 + pulse * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // title
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#ff69b4';
    ctx.shadowBlur = 15;
    ctx.fillText('🌸 Kawaii Math Adventure 🌸', W / 2, 55);
    ctx.shadowBlur = 0;

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ffb6c1';
    ctx.fillText('Choose a World!  ← →  then Space', W / 2, 85);

    // world nodes — horizontal row
    const nodeY = H / 2 + 20;
    const spacing = W / (WORLDS.length + 1);

    // path line
    ctx.strokeStyle = '#4B0082';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(spacing, nodeY);
    ctx.lineTo(spacing * WORLDS.length, nodeY);
    ctx.stroke();
    ctx.setLineDash([]);

    WORLDS.forEach((world, i) => {
      const nx = spacing * (i + 1);
      const isSelected = i === this.selected;
      const isUnlocked = i === 0 || this.game.state.worldProgress[i - 1] >= 5;

      // glow for selected
      if (isSelected) {
        ctx.shadowColor = world.accentColor;
        ctx.shadowBlur = 20;
      }

      // circle node
      ctx.beginPath();
      ctx.arc(nx, nodeY, isSelected ? 38 : 30, 0, Math.PI * 2);
      ctx.fillStyle = isUnlocked ? world.platformColor : '#333';
      ctx.fill();
      ctx.strokeStyle = isSelected ? world.accentColor : '#555';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // emoji
      ctx.font = `${isSelected ? 32 : 26}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(world.emoji, nx, nodeY + 10);

      // world name
      ctx.font = `${isSelected ? 'bold ' : ''}14px sans-serif`;
      ctx.fillStyle = isUnlocked ? '#fff' : '#666';
      ctx.fillText(world.name, nx, nodeY + 55);

      // progress
      const prog = this.game.state.worldProgress[i];
      ctx.font = '12px sans-serif';
      ctx.fillStyle = world.accentColor;
      ctx.fillText(`${prog}/5 ⭐`, nx, nodeY + 73);

      // lock icon
      if (!isUnlocked) {
        ctx.font = '20px serif';
        ctx.fillText('🔒', nx, nodeY - 10);
      }
    });

    // bottom hint
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#9966cc';
    ctx.textAlign = 'center';
    ctx.fillText(`Total Stars: ${this.game.state.stars} ⭐   Lives: ${'❤️'.repeat(this.game.state.lives)}`, W / 2, H - 20);
  }
}
