class Enemy {
  constructor(x, y, patrolLeft, patrolRight) {
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 30;
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
    const bob = Math.sin(this.wobble) * 2.5;
    const dir = this.vx > 0 ? 1 : -1;

    // World-themed block colors
    const blockColors = ['#ff69b4', '#00b4d8', '#8b2be2', '#3cb371', '#e85d04'];
    const highlightColors = ['#ffb3d9', '#66d4ee', '#c57dff', '#7ed4a0', '#f4a261'];
    const shadowColors = ['#cc0066', '#006d99', '#4a0099', '#1a7a40', '#a33800'];
    const col = blockColors[worldIndex % blockColors.length];
    const hi  = highlightColors[worldIndex % highlightColors.length];
    const sh  = shadowColors[worldIndex % shadowColors.length];

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16 + bob, 12, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Block body - bottom shadow face (3D effect)
    ctx.beginPath();
    ctx.roundRect(this.x + 2, this.y + 4 + bob, this.w - 2, this.h, 7);
    ctx.fillStyle = sh;
    ctx.fill();

    // Main block face
    ctx.beginPath();
    ctx.roundRect(this.x, this.y + bob, this.w, this.h, 7);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = sh;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top highlight
    ctx.beginPath();
    ctx.roundRect(this.x + 4, this.y + 3 + bob, this.w - 8, 7, 3);
    ctx.fillStyle = hi + 'aa';
    ctx.fill();

    // Eyes - white sclera
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 2 + bob, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 2 + bob, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Pupils (look in direction of travel)
    ctx.beginPath();
    ctx.ellipse(cx - 6 + dir * 1.5, cy - 1 + bob, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6 + dir * 1.5, cy - 1 + bob, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();

    // Eye shines
    ctx.beginPath();
    ctx.ellipse(cx - 5 + dir, cy - 3 + bob, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 + dir, cy - 3 + bob, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Angry eyebrows (V shape toward center)
    ctx.strokeStyle = '#1a0033';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 9 + bob);
    ctx.lineTo(cx - 2, cy - 7 + bob - (dir > 0 ? 2 : 0));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 11, cy - 9 + bob);
    ctx.lineTo(cx + 2, cy - 7 + bob - (dir < 0 ? 2 : 0));
    ctx.stroke();

    // Grumpy mouth
    ctx.beginPath();
    ctx.arc(cx, cy + 6 + bob, 4.5, 0.25, Math.PI - 0.25, true);
    ctx.strokeStyle = '#1a0033';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Little round feet
    ctx.beginPath();
    ctx.ellipse(cx - 7, cy + 16 + bob, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();
    ctx.strokeStyle = sh; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + 7, cy + 16 + bob, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();
    ctx.stroke();
  }
}
