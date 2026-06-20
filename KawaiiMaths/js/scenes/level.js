class LevelScene {
  constructor(game) {
    this.game = game;
    this.world = WORLDS[game.state.currentWorld];
    this.eq = generateEquation(game.state.currentWorld, game.state.currentLevel);
    this.platforms = this._buildPlatforms();
    this.player = new Player(80, 300);
    this.enemies = this._buildEnemies();
    this.portals = this._buildPortals();
    this.screenFlash = null;
    this.screenFlashTimer = 0;
    this.particles = [];
    this.powerups = this._buildPowerups();
  }

  onInput(code, type) {}

  _buildPlatforms() {
    const level = this.game.state.currentLevel;
    const seed = (this.game.state.currentWorld * 10 + level) * 7;
    let _si = 0;
    const rand = () => {
      _si++;
      let s = seed + _si * 1664525 + 1013904223;
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
    const platforms = [{ x: 0, y: 460, w: 800, h: 40, type: 'static' }];
    const xs = [60, 180, 300, 450, 580, 680];
    const ys = [370, 310, 260, 330, 280, 350];
    for (let i = 0; i < 6; i++) {
      const px = (xs[i] + (rand() * 40 - 20)) | 0;
      const py = (ys[i] + (rand() * 30 - 15)) | 0;
      const pw = (100 + rand() * 40) | 0;
      // first 2 platforms: static. Later platforms: moving or disappearing based on level
      let type = 'static';
      if (level >= 3 && i === 2) type = 'moving';
      if (level >= 5 && i === 3) type = 'disappearing';
      if (level >= 7 && i === 4) type = 'moving';
      if (level >= 9 && i === 5) type = 'disappearing';

      const p = { x: px, y: py, w: pw, h: 18, type };
      if (type === 'moving') {
        p.moveDir = 1;
        p.moveSpeed = 60 + level * 4;
        p.moveLeft = Math.max(0, px - 80);
        p.moveRight = Math.min(760, px + 80);
      }
      if (type === 'disappearing') {
        p.disappearState = 'solid';
        p.disappearTimer = 0;
        p.disappearCooldown = 0;
      }
      platforms.push(p);
    }
    return platforms;
  }

  _buildEnemies() {
    const level = this.game.state.currentLevel;
    const count = 1 + Math.floor(level / 2);
    const enemies = [];
    const positions = [[150, 370, 100, 280], [420, 310, 370, 530], [620, 280, 570, 720]];
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const [x, y, pl, pr] = positions[i];
      enemies.push(new Enemy(x, y - 28, pl, pr));
    }
    return enemies;
  }

  _buildPortals() {
    const { answer, distractors, portalCount } = this.eq;
    const numbers = [answer, ...distractors]; // length = portalCount
    const seed = this.game.state.currentWorld * 100 + this.game.state.currentLevel + 999;
    let s = seed;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const portalY = 380;
    const spacing = 800 / (portalCount + 1);
    return numbers.map((num, i) => new Portal(spacing * (i + 1) - 30, portalY, num, num === answer));
  }

  _buildPowerups() {
    const types = ['speed', 'doublejump', 'shield', 'multiplier'];
    const seed = this.game.state.currentWorld * 1000 + this.game.state.currentLevel + 42;
    let s = seed;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    const result = [];
    const candidates = this.platforms.slice(1); // skip ground
    const count = this.game.state.currentLevel >= 2 ? (rand() < 0.5 ? 2 : 1) : 1;
    const usedIdx = new Set();
    for (let i = 0; i < count; i++) {
      let idx;
      do { idx = Math.floor(rand() * candidates.length); } while (usedIdx.has(idx));
      usedIdx.add(idx);
      const plat = candidates[idx];
      const type = types[Math.floor(rand() * types.length)];
      result.push(new PowerUp(plat.x + plat.w / 2 - 14, plat.y - 32, type));
    }
    return result;
  }

  _applyPowerup(type) {
    Audio.correct(); // reuse sound as pickup sound
    if (type === 'speed') {
      this.player.speedBoost = true;
      this.player.speedBoostTimer = 8;
    } else if (type === 'doublejump') {
      this.player.extraJumpsLeft = 1;
    } else if (type === 'shield') {
      this.player.shieldActive = true;
    } else if (type === 'multiplier') {
      this.player.starMultiplier = 2;
      this.player.starMultiplierTimer = 10;
    }
    this._spawnParticles(this.player.x + 16, this.player.y, POWERUP_DEFS[type].color, 10);
  }

  _spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (80 + Math.random() * 80),
        vy: Math.sin(angle) * (80 + Math.random() * 80) - 60,
        life: 0.8,
        maxLife: 0.8,
        color,
        r: 3 + Math.random() * 4
      });
    }
  }

  update(dt) {
    if (this.screenFlashTimer > 0) this.screenFlashTimer -= dt;

    // portals
    for (const p of this.portals) p.update(dt);

    // update moving platforms
    for (const p of this.platforms) {
      if (p.type === 'moving') {
        p.x += p.moveDir * p.moveSpeed * dt;
        if (p.x <= p.moveLeft) { p.x = p.moveLeft; p.moveDir = 1; }
        if (p.x + p.w >= p.moveRight) { p.x = p.moveRight - p.w; p.moveDir = -1; }
      }
      if (p.type === 'disappearing') {
        if (p.disappearState === 'shaking') {
          p.disappearTimer -= dt;
          if (p.disappearTimer <= 0) { p.disappearState = 'gone'; p.disappearCooldown = 2.5; }
        } else if (p.disappearState === 'gone') {
          p.disappearCooldown -= dt;
          if (p.disappearCooldown <= 0) { p.disappearState = 'solid'; }
        }
      }
    }

    // player
    const activePlatforms = this.platforms.filter(p => p.type !== 'disappearing' || p.disappearState !== 'gone');
    this.player.update(dt, this.game.keys, activePlatforms);

    // trigger disappearing platforms
    for (const p of this.platforms) {
      if (p.type === 'disappearing' && p.disappearState === 'solid') {
        const onIt = this.player.onGround &&
          this.player.x + this.player.w > p.x && this.player.x < p.x + p.w &&
          Math.abs((this.player.y + this.player.h) - p.y) < 4;
        if (onIt) { p.disappearState = 'shaking'; p.disappearTimer = 1.5; }
      }
    }

    // fall off bottom = lose life
    if (this.player.y > 520) {
      this._loseLife();
      return;
    }

    // portal collision
    for (const portal of this.portals) {
      if (portal.checkEntry(this.player)) {
        if (portal.isCorrect) {
          portal.flash('correct');
          this.player.celebrate();
          this._spawnParticles(this.player.x + 16, this.player.y + 18, this.world.accentColor, 16);
          Audio.correct();
          this.screenFlash = '#ffffff';
          this.screenFlashTimer = 0.3;
          setTimeout(() => this._levelComplete(), 1200);
        } else {
          portal.flash('wrong');
          Audio.wrong();
          this.screenFlash = '#ff0000';
          this.screenFlashTimer = 0.25;
          // bounce player back
          this.player.x = Math.max(10, this.player.x - 80);
          this.player.vy = -300;
          this._loseLife();
        }
        return;
      }
    }

    // enemy interactions
    for (const enemy of this.enemies) {
      enemy.update(dt);
      if (enemy.checkStomp(this.player)) {
        enemy.alive = false;
        this.player.vy = -300;
        this.game.state.stars += this.player.starMultiplier;
        Audio.stomp();
        this._spawnParticles(enemy.x + 14, enemy.y + 14, '#FFD700', 8);
      } else if (enemy.checkHit(this.player)) {
        if (this.player.takeDamage()) {
          this._loseLife();
        }
      }
    }

    // power-ups
    for (const pu of this.powerups) {
      pu.update(dt);
      if (pu.checkCollect(this.player)) {
        this._applyPowerup(pu.type);
      }
    }

    // particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  _loseLife() {
    this.game.state.lives--;
    Audio.lifeLost();
    this.screenFlash = '#ff000066';
    this.screenFlashTimer = 0.5;
    if (this.game.state.lives <= 0) {
      setTimeout(() => {
        if (typeof ResultScene !== 'undefined') {
          this.game.switchScene(new ResultScene(this.game, false));
        } else {
          console.log('[LevelScene] Game over — ResultScene not yet defined');
        }
      }, 800);
    } else {
      // respawn
      this.player = new Player(80, 300);
    }
  }

  _levelComplete() {
    const w = this.game.state.currentWorld;
    const l = this.game.state.currentLevel;
    this.game.state.worldProgress[w] = Math.max(this.game.state.worldProgress[w], l + 1);
    this.game.state.currentLevel++;
    if (typeof ResultScene !== 'undefined') {
      this.game.switchScene(new ResultScene(this.game, true));
    } else {
      console.log('[LevelScene] Level complete — ResultScene not yet defined');
    }
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;
    const world = this.world;

    // sky background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, world.skyColor);
    grad.addColorStop(1, world.bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // world-specific background decoration
    this._drawBackground(ctx, W, H);

    // platforms
    for (const p of this.platforms) {
      if (p.type === 'disappearing' && p.disappearState === 'gone') continue;
      const shake = (p.type === 'disappearing' && p.disappearState === 'shaking')
        ? Math.sin(Date.now() / 40) * 3 : 0;
      ctx.save();
      ctx.translate(shake, 0);
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, p.h === 40 ? 0 : 8);
      const alpha = (p.type === 'disappearing' && p.disappearState === 'shaking')
        ? 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 120)) : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = world.platformColor;
      ctx.fill();
      ctx.strokeStyle = world.accentColor + '66';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(p.x + 4, p.y + 2, p.w - 8, 4, 2);
      ctx.fillStyle = world.accentColor + '33';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // portals
    for (const p of this.portals) p.draw(ctx, world.accentColor);

    // enemies
    for (const e of this.enemies) e.draw(ctx, this.game.state.currentWorld);

    // power-ups
    for (const pu of this.powerups) pu.draw(ctx);

    // player
    this.player.draw(ctx);

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // screen flash
    if (this.screenFlashTimer > 0) {
      ctx.globalAlpha = this.screenFlashTimer * 1.5;
      ctx.fillStyle = this.screenFlash;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // HUD
    this._drawHUD(ctx, W);
  }

  _drawBackground(ctx, W, H) {
    const wi = this.game.state.currentWorld;
    if (wi === 0) { // Candy — clouds
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      [[100,80,70,35],[300,50,90,40],[550,90,80,35],[700,60,60,30]].forEach(([x,y,rw,rh]) => {
        ctx.beginPath(); ctx.ellipse(x,y,rw,rh,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+rw*0.5,y-rh*0.3,rw*0.6,rh*0.7,0,0,Math.PI*2); ctx.fill();
      });
    } else if (wi === 1) { // Ocean — bubbles
      ctx.fillStyle = 'rgba(0,200,220,0.12)';
      for (let i = 0; i < 12; i++) {
        const bx = (i * 67 + 30) % W, by = (i * 53 + 50) % (H - 100);
        ctx.beginPath(); ctx.arc(bx, by, 8 + i % 5 * 4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (wi === 2) { // Star — stars
      ctx.fillStyle = 'rgba(255,215,0,0.5)';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 137) % W, sy = (i * 97 + 20) % (H * 0.6);
        ctx.font = '14px serif'; ctx.textAlign = 'left';
        ctx.fillText('✦', sx, sy);
      }
    } else if (wi === 3) { // Forest — mushrooms
      [[80,440],[200,450],[650,445],[730,442]].forEach(([mx,my]) => {
        ctx.fillStyle = '#cc3300';
        ctx.beginPath(); ctx.ellipse(mx, my - 15, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath(); ctx.roundRect(mx-7, my-15, 14, 20, 3); ctx.fill();
      });
    } else if (wi === 4) { // Castle — sakura petals
      ctx.fillStyle = 'rgba(255,182,193,0.6)';
      for (let i = 0; i < 15; i++) {
        const px = (i * 53 + 20) % W, py = (i * 79 + 30) % (H - 80);
        ctx.font = '16px serif'; ctx.textAlign = 'left';
        ctx.fillText('🌸', px, py);
      }
    }
  }

  _drawHUD(ctx, W) {
    // top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 54, [0, 0, 12, 12]);
    ctx.fill();

    // equation bubble
    const eq = this.eq.display;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(eq).width + 40;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(W/2 - textW/2, 7, textW, 38, 10);
    ctx.fill();
    ctx.fillStyle = '#1a0033';
    ctx.fillText(eq, W/2, 33);

    // hearts
    ctx.textAlign = 'left';
    ctx.font = '22px serif';
    const maxLives = 3;
    for (let i = 0; i < maxLives; i++) {
      ctx.globalAlpha = i < this.game.state.lives ? 1 : 0.2;
      ctx.fillText('❤️', 10 + i * 28, 36);
    }
    ctx.globalAlpha = 1;

    // stars
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`⭐ ${this.game.state.stars}`, W - 10, 35);

    // active power-up indicators
    let puX = 10;
    ctx.font = '16px serif';
    ctx.textAlign = 'left';
    if (this.player.speedBoost) { ctx.fillText(`🥾 ${this.player.speedBoostTimer.toFixed(1)}s`, puX, 52); puX += 80; }
    if (this.player.extraJumpsLeft > 0) { ctx.fillText('🍄', puX, 52); puX += 30; }
    if (this.player.shieldActive) { ctx.fillText('🛡️', puX, 52); puX += 30; }
    if (this.player.starMultiplierTimer > 0) { ctx.fillText(`⭐×2 ${this.player.starMultiplierTimer.toFixed(1)}s`, puX, 52); }

    // world/level indicator
    ctx.font = '12px sans-serif';
    ctx.fillStyle = this.world.accentColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.world.emoji} ${this.world.name}  L${this.game.state.currentLevel + 1}/10`, W - 10, 52);

    ctx.textAlign = 'left';
  }
}
