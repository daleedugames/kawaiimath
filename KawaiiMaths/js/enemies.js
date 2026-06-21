class Enemy {
  constructor(x, y, patrolLeft, patrolRight) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 28;
    this.patrolLeft = patrolLeft;
    this.patrolRight = patrolRight;
    this.vx = 60;
    this.alive = true;
    this.wobble = 0;
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt;
    this.wobble += dt * 5;
    if (this.x <= this.patrolLeft)  { this.x = this.patrolLeft;  this.vx =  60; }
    if (this.x + this.w >= this.patrolRight) { this.x = this.patrolRight - this.w; this.vx = -60; }
  }

  checkStomp(player) {
    if (!this.alive) return false;
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    const overlap = px + pw > this.x + 4 && px < this.x + this.w - 4;
    const feetNear = py + ph > this.y && py + ph < this.y + 16 && player.vy > 0;
    return overlap && feetNear;
  }

  checkHit(player) {
    if (!this.alive || player.invincible) return false;
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    return px + pw > this.x + 4 && px < this.x + this.w - 4 &&
           py + ph > this.y + 8 && py < this.y + this.h;
  }

  draw(ctx, worldIndex) {
    if (!this.alive) return;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const bob = Math.sin(this.wobble) * 2;

    // body (onigiri triangle-ish)
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, 13, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = worldIndex === 1 ? '#7EC8E3' : '#f5f5f5';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();

    // seaweed strip (onigiri style)
    ctx.beginPath();
    ctx.roundRect(cx - 10, cy + 4 + bob, 20, 7, 2);
    ctx.fillStyle = '#2d5a1b';
    ctx.fill();

    // eyes
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 2 + bob, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 2 + bob, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    // shine
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 3 + bob, 1, 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - 3 + bob, 1, 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // blush
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + 2 + bob, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,150,0.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 2 + bob, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,150,0.5)';
    ctx.fill();

    // little feet
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy + 13 + bob, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 13 + bob, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd';
    ctx.fill();
  }
}
