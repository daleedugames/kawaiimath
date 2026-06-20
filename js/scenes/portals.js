class Portal {
  constructor(x, y, number, isCorrect) {
    this.x = x;
    this.y = y;
    this.w = 60;
    this.h = 80;
    this.number = number;
    this.isCorrect = isCorrect;
    this.flashType = null;
    this.flashTimer = 0;
    this.shimmer = 0;
  }

  update(dt) {
    this.shimmer += dt * 3;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashType = null;
    }
  }

  flash(type) {
    this.flashType = type;
    this.flashTimer = 0.4;
  }

  checkEntry(player) {
    return (
      player.x + player.w > this.x + 8 &&
      player.x < this.x + this.w - 8 &&
      player.y + player.h > this.y + 20 &&
      player.y < this.y + this.h
    );
  }

  draw(ctx, accentColor) {
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const cx = x + w / 2;
    const shimmerAlpha = 0.5 + 0.5 * Math.sin(this.shimmer);

    // flash overlay colour
    let glowColor = accentColor;
    if (this.flashType === 'correct') glowColor = '#00ff88';
    if (this.flashType === 'wrong')   glowColor = '#ff3333';

    // glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18 + shimmerAlpha * 10;

    // left pillar
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 28, 10, h - 28, 3);
    ctx.fillStyle = this.flashType === 'wrong' ? '#cc2222' : '#8B0000';
    ctx.fill();

    // right pillar
    ctx.beginPath();
    ctx.roundRect(x + w - 16, y + 28, 10, h - 28, 3);
    ctx.fillStyle = this.flashType === 'wrong' ? '#cc2222' : '#8B0000';
    ctx.fill();

    // top horizontal beam
    ctx.beginPath();
    ctx.roundRect(x, y + 14, w, 10, 3);
    ctx.fillStyle = this.flashType === 'wrong' ? '#cc2222' : '#8B0000';
    ctx.fill();

    // curved top beam (the curved sotoba)
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 18);
    ctx.quadraticCurveTo(cx, y, x + w + 4, y + 18);
    ctx.lineWidth = 8;
    ctx.strokeStyle = this.flashType === 'wrong' ? '#cc2222' : '#8B0000';
    ctx.stroke();

    ctx.shadowBlur = 0;

    // portal entrance shimmer
    const portalGrad = ctx.createLinearGradient(x + 16, y + 28, x + w - 32, y + h);
    portalGrad.addColorStop(0, `${accentColor}44`);
    portalGrad.addColorStop(0.5, `${accentColor}88`);
    portalGrad.addColorStop(1, `${accentColor}22`);
    ctx.beginPath();
    ctx.rect(x + 16, y + 28, w - 32, h - 28);
    ctx.fillStyle = portalGrad;
    ctx.fill();

    // number label — wooden sign
    ctx.beginPath();
    ctx.roundRect(cx - 22, y + 36, 44, 30, 6);
    ctx.fillStyle = '#8B6914';
    ctx.fill();
    ctx.strokeStyle = '#5C4500';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(this.number, cx, y + 57);
    ctx.shadowBlur = 0;

    // sparkles on correct flash
    if (this.flashType === 'correct') {
      ctx.font = '16px serif';
      ['✨','⭐','✨'].forEach((s, i) => {
        ctx.fillText(s, cx + (i - 1) * 22, y - 8 + Math.sin(Date.now()/150 + i) * 6);
      });
    }
  }
}
