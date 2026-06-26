class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 44;
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
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }
    if (this.celebrating) {
      this.celebrateTimer -= dt;
      if (this.celebrateTimer <= 0) this.celebrating = false;
      this.vy = 0; this.vx = 0;
      return;
    }
    if (this.speedBoost) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) this.speedBoost = false;
    }
    if (this.starMultiplierTimer > 0) {
      this.starMultiplierTimer -= dt;
      if (this.starMultiplierTimer <= 0) this.starMultiplier = 1;
    }
    const speed = this.speedBoost ? 360 : 180;
    const gravity = 900;
    const jumpForce = -420;
    const maxJumpHold = 0.18;
    this.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA'])  { this.vx = -speed; this.facingRight = false; }
    if (keys['ArrowRight'] || keys['KeyD']) { this.vx =  speed; this.facingRight = true;  }
    const jumpPressed = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
    if (jumpPressed && this.onGround) {
      this.vy = jumpForce; this.jumpHeld = true; this.jumpHeldTime = 0; Audio.jump();
    }
    if (jumpPressed && this.jumpHeld) {
      this.jumpHeldTime += dt;
      if (this.jumpHeldTime < maxJumpHold) this.vy -= 300 * dt;
    }
    if (!jumpPressed) this.jumpHeld = false;
    if (jumpPressed && !this.onGround && !this._jumpPressedLast && this.extraJumpsLeft > 0) {
      this.vy = -420; this.extraJumpsLeft--; Audio.jump();
    }
    this._jumpPressedLast = jumpPressed;
    this.vy += gravity * dt;
    if (this.vy > 800) this.vy = 800;
    this.x += this.vx * dt;
    this.x = Math.max(0, Math.min(800 - this.w, this.x));
    this.y += this.vy * dt;
    this.onGround = false;
    for (const p of platforms) {
      if (this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + 20 && this.vy >= 0) {
        this.y = p.y - this.h; this.vy = 0; this.onGround = true;
      }
    }
    if (this.vx !== 0 && this.onGround) {
      this.walkTimer += dt;
      if (this.walkTimer > 0.12) { this.walkFrame = 1 - this.walkFrame; this.walkTimer = 0; }
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
    const by = this.y + this.h; // feet bottom
    const bob = this.onGround ? Math.sin(this.bobTimer * 5) * 1.5 : 0;
    const legSwing = this.walkFrame === 1 ? 3 : -1;

    if (!this.facingRight) {
      ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0);
    }

    // --- SHOES ---
    ctx.beginPath();
    ctx.ellipse(cx - 6, by + 2 + bob + (this.walkFrame ? legSwing : 0), 7, 4, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1493';
    ctx.fill();
    ctx.strokeStyle = '#990060'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx + 6, by + 2 + bob + (this.walkFrame ? -legSwing : 0), 7, 4, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1493';
    ctx.fill();
    ctx.strokeStyle = '#990060'; ctx.lineWidth = 1.5; ctx.stroke();

    // --- LEGS (white socks) ---
    ctx.beginPath();
    ctx.roundRect(cx - 10, by - 11 + bob, 9, 12, 3);
    ctx.fillStyle = '#fff9';
    ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(cx + 1, by - 11 + bob, 9, 12, 3);
    ctx.fillStyle = '#fff9';
    ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke();

    // --- SKIRT (blue, flared) ---
    ctx.beginPath();
    ctx.moveTo(cx - 14, by - 19 + bob);
    ctx.lineTo(cx - 16, by - 9 + bob);
    ctx.lineTo(cx + 16, by - 9 + bob);
    ctx.lineTo(cx + 14, by - 19 + bob);
    ctx.closePath();
    ctx.fillStyle = '#4a7cf7';
    ctx.fill();
    ctx.strokeStyle = '#2855cc'; ctx.lineWidth = 1.5; ctx.stroke();

    // skirt pleat lines
    ctx.strokeStyle = '#2855cc88'; ctx.lineWidth = 1;
    [-6, 0, 6].forEach(ox => {
      ctx.beginPath();
      ctx.moveTo(cx + ox, by - 19 + bob);
      ctx.lineTo(cx + ox * 1.2, by - 9 + bob);
      ctx.stroke();
    });

    // --- BODY (white sailor top) ---
    ctx.beginPath();
    ctx.roundRect(cx - 11, by - 33 + bob, 22, 16, 5);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#4a7cf7'; ctx.lineWidth = 1.5; ctx.stroke();

    // Sailor collar V-line
    ctx.beginPath();
    ctx.moveTo(cx - 5, by - 33 + bob);
    ctx.lineTo(cx, by - 26 + bob);
    ctx.lineTo(cx + 5, by - 33 + bob);
    ctx.strokeStyle = '#4a7cf7'; ctx.lineWidth = 2; ctx.stroke();

    // Bow / tie
    ctx.beginPath();
    ctx.moveTo(cx - 5, by - 30 + bob);
    ctx.lineTo(cx, by - 27 + bob);
    ctx.lineTo(cx + 5, by - 30 + bob);
    ctx.fillStyle = '#ff1493';
    ctx.fill();

    // --- HEAD ---
    ctx.beginPath();
    ctx.ellipse(cx, by - 48 + bob, 15, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe0c8';
    ctx.fill();
    ctx.strokeStyle = '#c8845a'; ctx.lineWidth = 1.5; ctx.stroke();

    // --- HAIR BASE (pink) ---
    ctx.beginPath();
    ctx.ellipse(cx, by - 56 + bob, 16, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff69b4';
    ctx.fill();
    ctx.strokeStyle = '#cc1166'; ctx.lineWidth = 1; ctx.stroke();

    // bangs
    ctx.beginPath();
    ctx.ellipse(cx - 6, by - 49 + bob, 5, 7, -0.3, Math.PI, 0, true);
    ctx.fillStyle = '#ff69b4';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, by - 49 + bob, 5, 7, 0.3, Math.PI, 0, true);
    ctx.fillStyle = '#ff69b4';
    ctx.fill();

    // LEFT TWINTAIL
    ctx.beginPath();
    ctx.ellipse(cx - 19, by - 48 + bob, 6, 12, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff69b4';
    ctx.fill();
    ctx.strokeStyle = '#cc1166'; ctx.lineWidth = 1; ctx.stroke();
    // hair tie left
    ctx.beginPath();
    ctx.arc(cx - 14, by - 55 + bob, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1493';
    ctx.fill();
    ctx.strokeStyle = '#990060'; ctx.lineWidth = 1; ctx.stroke();

    // RIGHT TWINTAIL
    ctx.beginPath();
    ctx.ellipse(cx + 19, by - 48 + bob, 6, 12, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff69b4';
    ctx.fill();
    ctx.strokeStyle = '#cc1166'; ctx.lineWidth = 1; ctx.stroke();
    // hair tie right
    ctx.beginPath();
    ctx.arc(cx + 14, by - 55 + bob, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1493';
    ctx.fill();
    ctx.strokeStyle = '#990060'; ctx.lineWidth = 1; ctx.stroke();

    // --- EYES ---
    // Left eye outline
    ctx.beginPath();
    ctx.ellipse(cx - 6, by - 48 + bob, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0044'; ctx.fill();
    // Left iris
    ctx.beginPath();
    ctx.ellipse(cx - 6, by - 48 + bob, 4, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#a04fff'; ctx.fill();
    // Left pupil
    ctx.beginPath();
    ctx.ellipse(cx - 6, by - 47 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0022'; ctx.fill();
    // Left shines
    ctx.beginPath();
    ctx.ellipse(cx - 4.5, by - 50 + bob, 2, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 8, by - 47 + bob, 1, 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

    // Right eye outline
    ctx.beginPath();
    ctx.ellipse(cx + 6, by - 48 + bob, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0044'; ctx.fill();
    // Right iris
    ctx.beginPath();
    ctx.ellipse(cx + 6, by - 48 + bob, 4, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#a04fff'; ctx.fill();
    // Right pupil
    ctx.beginPath();
    ctx.ellipse(cx + 6, by - 47 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0022'; ctx.fill();
    // Right shines
    ctx.beginPath();
    ctx.ellipse(cx + 7.5, by - 50 + bob, 2, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, by - 47 + bob, 1, 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

    // eyelashes top
    ctx.strokeStyle = '#1a0044'; ctx.lineWidth = 1.5;
    [[-9.5, -54, -7, -56], [-5.5, -55, -4, -57], [cx - 2.5 - cx, -54, cx - 1 - cx, -55]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(cx + x1, by + y1 + bob);
      ctx.lineTo(cx + x2, by + y2 + bob);
      ctx.stroke();
    });

    // --- NOSE (tiny dot) ---
    ctx.beginPath();
    ctx.ellipse(cx, by - 43 + bob, 1.8, 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e8a090'; ctx.fill();

    // --- MOUTH ---
    ctx.beginPath();
    ctx.arc(cx, by - 40 + bob, 4.5, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#d06060'; ctx.lineWidth = 1.8; ctx.stroke();

    // --- BLUSH ---
    ctx.beginPath();
    ctx.ellipse(cx - 12, by - 45 + bob, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,130,130,0.45)'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 12, by - 45 + bob, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,130,130,0.45)'; ctx.fill();

    // --- SHIELD ---
    if (this.shieldActive) {
      ctx.beginPath();
      ctx.arc(cx, by - 30 + bob, 26, 0, Math.PI * 2);
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(Date.now() / 120);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // --- SPEED TRAIL ---
    if (this.speedBoost) {
      ctx.fillStyle = 'rgba(0,255,180,0.25)';
      const dir = this.facingRight ? -1 : 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + dir * i * 12, by - 20 + bob, 6, 14, 0, 0, Math.PI * 2);
        ctx.globalAlpha = 0.15 * (4 - i);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // --- CELEBRATE ---
    if (this.celebrating) {
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      const t = Date.now() / 100;
      ctx.fillText('✨', cx + Math.cos(t) * 22, by - 70 + bob + Math.sin(t) * 4);
      ctx.fillText('⭐', cx + Math.cos(t + 2) * 20, by - 60 + bob + Math.sin(t + 1) * 4);
      ctx.fillText('💖', cx + Math.cos(t + 4) * 22, by - 75 + bob + Math.sin(t + 2) * 4);
    }

    ctx.restore();
  }
}
