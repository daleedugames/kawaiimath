class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 36;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.alive = true;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.celebrating = false;
    this.celebrateTimer = 0;
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.bobTimer = 0;
    this.facingRight = true;
    this.jumpHeld = false;
    this.jumpHeldTime = 0;
    // power-up state
    this.speedBoost = false;
    this.speedBoostTimer = 0;
    this.extraJumpsLeft = 0;
    this.shieldActive = false;
    this.starMultiplier = 1;
    this.starMultiplierTimer = 0;
    this._jumpPressedLast = false;
  }

  update(dt, keys, platforms) {
    if (!this.alive) return;

    // invincibility
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // celebrating (no movement)
    if (this.celebrating) {
      this.celebrateTimer -= dt;
      if (this.celebrateTimer <= 0) this.celebrating = false;
      this.vy = 0; this.vx = 0;
      return;
    }

    if (this.speedBoost) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) { this.speedBoost = false; }
    }
    if (this.starMultiplierTimer > 0) {
      this.starMultiplierTimer -= dt;
      if (this.starMultiplierTimer <= 0) { this.starMultiplier = 1; }
    }

    const speed = this.speedBoost ? 360 : 180;
    const gravity = 900;
    const jumpForce = -420;
    const maxJumpHold = 0.18;

    // horizontal
    this.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA'])  { this.vx = -speed; this.facingRight = false; }
    if (keys['ArrowRight'] || keys['KeyD']) { this.vx =  speed; this.facingRight = true;  }

    // jump
    const jumpPressed = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
    if (jumpPressed && this.onGround) {
      this.vy = jumpForce;
      this.jumpHeld = true;
      this.jumpHeldTime = 0;
      Audio.jump();
    }
    if (jumpPressed && this.jumpHeld) {
      this.jumpHeldTime += dt;
      if (this.jumpHeldTime < maxJumpHold) this.vy -= 300 * dt;
    }
    if (!jumpPressed) this.jumpHeld = false;

    if (jumpPressed && !this.onGround && !this._jumpPressedLast && this.extraJumpsLeft > 0) {
      this.vy = -420;
      this.extraJumpsLeft--;
      Audio.jump();
    }
    this._jumpPressedLast = jumpPressed;

    // gravity
    this.vy += gravity * dt;
    if (this.vy > 800) this.vy = 800;

    // move X
    this.x += this.vx * dt;
    this.x = Math.max(0, Math.min(800 - this.w, this.x));

    // move Y + platform collision
    this.y += this.vy * dt;
    this.onGround = false;
    for (const p of platforms) {
      if (
        this.x + this.w > p.x && this.x < p.x + p.w &&
        this.y + this.h > p.y && this.y + this.h < p.y + p.h + 20 &&
        this.vy >= 0
      ) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // walk animation
    if (this.vx !== 0 && this.onGround) {
      this.walkTimer += dt;
      if (this.walkTimer > 0.15) { this.walkFrame = 1 - this.walkFrame; this.walkTimer = 0; }
    } else { this.walkFrame = 0; }

    this.bobTimer += dt;
  }

  takeDamage() {
    if (this.invincible) return false;
    if (this.shieldActive) { this.shieldActive = false; return false; }
    this.invincible = true;
    this.invincibleTimer = 1.5;
    this.vy = -250;
    return true;
  }

  celebrate() {
    this.celebrating = true;
    this.celebrateTimer = 1.2;
    this.vy = -300;
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) return;

    ctx.save();
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const bob = this.onGround ? Math.sin(this.bobTimer * 4) * 1.5 : 0;
    const legOffset = this.walkFrame === 1 ? 3 : 0;

    if (!this.facingRight) { ctx.translate(cx, cy + bob); ctx.scale(-1, 1); ctx.translate(-cx, -(cy + bob)); }

    // tail
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 8 + bob, 10, 7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a882';
    ctx.fill();
    // tail rings
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 8 + bob, 7, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#8B6914';
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, 13, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a882';
    ctx.fill();

    // belly
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 + bob, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f5deb3';
    ctx.fill();

    // head
    ctx.beginPath();
    ctx.ellipse(cx, cy - 13 + bob, 13, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a882';
    ctx.fill();

    // ears
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 22 + bob, 5, 7, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a882';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 22 + bob, 5, 7, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a882';
    ctx.fill();

    // inner ears
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 22 + bob, 3, 4, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb6c1';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 22 + bob, 3, 4, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb6c1';
    ctx.fill();

    // eyes
    ctx.beginPath();
    ctx.ellipse(cx - 5, cy - 14 + bob, 4, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - 14 + bob, 4, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    // eye shine
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 15 + bob, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy - 15 + bob, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // nose
    ctx.beginPath();
    ctx.ellipse(cx, cy - 11 + bob, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9999';
    ctx.fill();

    // legs
    ctx.beginPath();
    ctx.roundRect(cx - 9, cy + 10 + bob + (this.walkFrame ? legOffset : 0), 8, 10, 3);
    ctx.fillStyle = '#b8945a';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx + 2, cy + 10 + bob + (this.walkFrame ? -legOffset : 0), 8, 10, 3);
    ctx.fillStyle = '#b8945a';
    ctx.fill();

    // celebrate spin effect
    if (this.celebrating) {
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨', cx + Math.cos(Date.now()/100)*20, cy - 30 + bob);
      ctx.fillText('⭐', cx + Math.cos(Date.now()/100 + 2)*20, cy - 20 + bob);
    }

    ctx.restore();
  }
}
