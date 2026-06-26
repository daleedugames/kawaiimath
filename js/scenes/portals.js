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
    this.shimmer += dt * 2.5;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashType = null;
    }
  }

  flash(type) { this.flashType = type; this.flashTimer = 0.5; }

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
    const pulse = 0.5 + 0.5 * Math.sin(this.shimmer);

    let glow = accentColor;
    if (this.flashType === 'correct') glow = '#00ff88';
    if (this.flashType === 'wrong')   glow = '#ff3333';

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(cx, y + h + 4, 20, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Outer glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18 + pulse * 14;

    // Left pillar
    const pillGrad = ctx.createLinearGradient(x + 4, 0, x + 16, 0);
    pillGrad.addColorStop(0, glow + 'dd');
    pillGrad.addColorStop(1, glow + '66');
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 30, 13, h - 30, [4, 0, 0, 4]);
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.strokeStyle = glow + 'cc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right pillar
    ctx.beginPath();
    ctx.roundRect(x + w - 17, y + 30, 13, h - 30, [0, 4, 4, 0]);
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.stroke();

    // Arch top
    ctx.beginPath();
    ctx.arc(cx, y + 32, w / 2 - 4, Math.PI, 0);
    ctx.lineTo(x + w - 4, y + 32);
    ctx.lineTo(x + 4, y + 32);
    ctx.closePath();
    ctx.fillStyle = glow + '99';
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Inner shimmer fill
    const ig = ctx.createLinearGradient(cx, y + 30, cx, y + h);
    ig.addColorStop(0,   glow + 'cc');
    ig.addColorStop(0.4, glow + '55');
    ig.addColorStop(1,   glow + '11');
    ctx.beginPath();
    ctx.rect(x + 17, y + 30, w - 34, h - 30);
    ctx.fillStyle = ig;
    ctx.fill();

    // Small decorative circles on pillars
    [y + 38, y + 54, y + 70].forEach(py => {
      if (py > y + 30 && py < y + h - 5) {
        ctx.beginPath();
        ctx.arc(x + 10, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = glow + 'cc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w - 10, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Number badge
    ctx.beginPath();
    ctx.roundRect(cx - 22, y + 34, 44, 30, 12);
    ctx.fillStyle = '#0a0020ee';
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 22px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.fillText(this.number, cx, y + 57);
    ctx.shadowBlur = 0;

    // Correct flash sparkles
    if (this.flashType === 'correct') {
      ctx.font = '16px serif';
      ['✨', '⭐', '✨'].forEach((s, i) => {
        ctx.fillText(s, cx + (i - 1) * 24, y - 6 + Math.sin(Date.now() / 140 + i) * 7);
      });
    }

    // Wrong flash X
    if (this.flashType === 'wrong') {
      ctx.font = '22px serif';
      ctx.fillText('❌', cx, y + 16);
    }
  }
}
