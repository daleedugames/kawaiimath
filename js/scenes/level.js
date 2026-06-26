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
    this.isChallenge = this.game.state.currentLevel % 5 === 4;
    this.timeLimit = 60;
    this.timeLeft = this.timeLimit;
    this.timeFailed = false;
    this.game.state.livesLostThisLevel = 0;
    this.game.state.levelStartTime = Date.now();
    this.hud = new HUD();
    this.anim = 0;
    this.bgParticles = this._initBgParticles();
  }

  _initBgParticles() {
    const arr = [];
    for (let i = 0; i < 20; i++) {
      arr.push({
        x: Math.random() * 800,
        y: Math.random() * 460,
        vy: -15 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 10,
        r: 2 + Math.random() * 4,
        alpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    return arr;
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
      let type = 'static';
      if (level >= 3 && i === 2) type = 'moving';
      if (level >= 5 && i === 3) type = 'disappearing';
      if (level >= 7 && i === 4) type = 'moving';
      if (level >= 9 && i === 5) type = 'disappearing';
      const p = { x: px, y: py, w: pw, h: 18, type };
      if (type === 'moving') {
        p.moveDir = 1; p.moveSpeed = 60 + level * 4;
        p.moveLeft = Math.max(0, px - 80); p.moveRight = Math.min(760, px + 80);
      }
      if (type === 'disappearing') {
        p.disappearState = 'solid'; p.disappearTimer = 0; p.disappearCooldown = 0;
      }
      platforms.push(p);
    }
    return platforms;
  }

  _buildEnemies() {
    const level = this.game.state.currentLevel;
    const count = 1 + Math.floor(level / 2);
    const enemies = [];
    // Place enemies on platforms 2, 3, 4 (indices into this.platforms array, skipping ground at [0] and first platform at [1])
    const platSlots = [2, 3, 4];
    for (let i = 0; i < Math.min(count, platSlots.length); i++) {
      const plat = this.platforms[platSlots[i]];
      if (!plat) continue;
      // Patrol within the platform bounds so enemy never walks off the edge
      const patrolLeft = plat.x;
      const patrolRight = plat.x + plat.w;
      const ex = plat.x + plat.w * 0.25;
      enemies.push(new Enemy(ex, plat.y - 30, patrolLeft, patrolRight));
    }
    return enemies;
  }

  _buildPortals() {
    const { answer, distractors, portalCount } = this.eq;
    const numbers = [answer, ...distractors];
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
    const candidates = this.platforms.slice(1);
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
    Audio.correct();
    if (type === 'speed')       { this.player.speedBoost = true; this.player.speedBoostTimer = 8; }
    else if (type === 'doublejump') { this.player.extraJumpsLeft = 1; }
    else if (type === 'shield')     { this.player.shieldActive = true; }
    else if (type === 'multiplier') { this.player.starMultiplier = 2; this.player.starMultiplierTimer = 10; }
    this._spawnParticles(this.player.x + 16, this.player.y, POWERUP_DEFS[type].color, 12);
  }

  _spawnParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (80 + Math.random() * 100),
        vy: Math.sin(angle) * (80 + Math.random() * 100) - 60,
        life: 0.9, maxLife: 0.9, color, r: 3 + Math.random() * 5,
        emoji: Math.random() < 0.3 ? (Math.random() < 0.5 ? '⭐' : '✨') : null
      });
    }
  }

  update(dt) {
    this.anim += dt;
    if (this.screenFlashTimer > 0) this.screenFlashTimer -= dt;

    // Animate bg particles
    for (const bp of this.bgParticles) {
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      if (bp.y < -10) { bp.y = 470; bp.x = Math.random() * 800; }
    }

    if (this.isChallenge && !this.timeFailed) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.timeFailed = true; this._loseLife(); }
    }
    for (const p of this.portals) p.update(dt);
    for (const p of this.platforms) {
      if (p.type === 'moving') {
        p.x += p.moveDir * p.moveSpeed * dt;
        if (p.x <= p.moveLeft)  { p.x = p.moveLeft;  p.moveDir = 1; }
        if (p.x + p.w >= p.moveRight) { p.x = p.moveRight - p.w; p.moveDir = -1; }
      }
      if (p.type === 'disappearing') {
        if (p.disappearState === 'shaking') {
          p.disappearTimer -= dt;
          if (p.disappearTimer <= 0) { p.disappearState = 'gone'; p.disappearCooldown = 2.5; }
        } else if (p.disappearState === 'gone') {
          p.disappearCooldown -= dt;
          if (p.disappearCooldown <= 0) p.disappearState = 'solid';
        }
      }
    }
    const activePlatforms = this.platforms.filter(p => p.type !== 'disappearing' || p.disappearState !== 'gone');
    this.player.update(dt, this.game.keys, activePlatforms);
    for (const p of this.platforms) {
      if (p.type === 'disappearing' && p.disappearState === 'solid') {
        const onIt = this.player.onGround &&
          this.player.x + this.player.w > p.x && this.player.x < p.x + p.w &&
          Math.abs((this.player.y + this.player.h) - p.y) < 4;
        if (onIt) { p.disappearState = 'shaking'; p.disappearTimer = 1.5; }
      }
    }
    if (this.player.y > 520) { this._loseLife(); return; }
    for (const portal of this.portals) {
      if (portal.checkEntry(this.player)) {
        if (portal.isCorrect) {
          portal.flash('correct');
          this.player.celebrate();
          this._spawnParticles(this.player.x + 16, this.player.y + 18, this.world.accentColor, 18);
          Audio.correct();
          this.screenFlash = '#ffffff44';
          this.screenFlashTimer = 0.4;
          setTimeout(() => this._levelComplete(), 1200);
        } else {
          portal.flash('wrong');
          Audio.wrong();
          this.screenFlash = '#ff000066';
          this.screenFlashTimer = 0.3;
          this.player.x = Math.max(10, this.player.x - 80);
          this.player.vy = -300;
          this._loseLife();
        }
        return;
      }
    }
    if (!this.player.celebrating) {
      for (const enemy of this.enemies) {
        enemy.update(dt);
        if (enemy.checkStomp(this.player)) {
          enemy.alive = false;
          this.player.vy = -300;
          this.game.state.stars += this.player.starMultiplier;
          Audio.stomp();
          this._spawnParticles(enemy.x + 14, enemy.y + 14, this.world.accentColor, 10);
        } else if (enemy.checkHit(this.player)) {
          if (this.player.takeDamage()) this._loseLife();
        }
      }
    }
    for (const pu of this.powerups) {
      pu.update(dt);
      if (pu.checkCollect(this.player)) this._applyPowerup(pu.type);
    }
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt; p.life -= dt;
      return p.life > 0;
    });
  }

  _loseLife() {
    this.game.state.livesLostThisLevel++;
    this.game.state.lives--;
    Audio.lifeLost();
    this.screenFlash = '#ff000066';
    this.screenFlashTimer = 0.5;
    if (this.game.state.lives <= 0) {
      setTimeout(() => {
        if (typeof ResultScene !== 'undefined') this.game.switchScene(new ResultScene(this.game, false));
      }, 800);
    } else {
      this.player = new Player(80, 300);
    }
  }

  _levelComplete() {
    const w = this.game.state.currentWorld;
    const l = this.game.state.currentLevel;
    this.game.state.worldProgress[w] = Math.max(this.game.state.worldProgress[w], l + 1);
    this.game.state.currentLevel++;
    if (typeof ResultScene !== 'undefined') this.game.switchScene(new ResultScene(this.game, true));
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;
    const world = this.world;

    // Sky background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, world.skyColor);
    grad.addColorStop(1, world.bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    this._drawBackground(ctx, W, H);
    this._drawPlatforms(ctx, world);

    for (const p of this.portals) p.draw(ctx, world.accentColor);
    for (const e of this.enemies) e.draw(ctx, this.game.state.currentWorld);
    for (const pu of this.powerups) pu.draw(ctx);

    this.player.draw(ctx);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      if (p.emoji) {
        ctx.font = `${Math.round(p.r * 3)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Screen flash
    if (this.screenFlashTimer > 0) {
      ctx.globalAlpha = this.screenFlashTimer * 1.8;
      ctx.fillStyle = this.screenFlash;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    this.hud.draw(ctx, this.game, this.world, this.eq, this.player, this.isChallenge, this.timeLeft);
  }

  _drawPlatforms(ctx, world) {
    for (const p of this.platforms) {
      if (p.type === 'disappearing' && p.disappearState === 'gone') continue;
      const shake = (p.type === 'disappearing' && p.disappearState === 'shaking')
        ? Math.sin(Date.now() / 40) * 3 : 0;
      const alpha = (p.type === 'disappearing' && p.disappearState === 'shaking')
        ? 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 120)) : 1;

      ctx.save();
      ctx.translate(shake, 0);
      ctx.globalAlpha = alpha;

      const isGround = p.h === 40;
      const r = isGround ? 0 : 10;

      if (!isGround) {
        // Drop shadow
        ctx.beginPath();
        ctx.roundRect(p.x + 4, p.y + p.h, p.w - 8, 10, [0, 0, 6, 6]);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fill();

        // Bottom 3D ledge
        ctx.beginPath();
        ctx.roundRect(p.x + 2, p.y + 6, p.w - 2, p.h + 6, r);
        const darkColor = world.platformColor + 'bb';
        ctx.fillStyle = darkColor;
        ctx.fill();
      }

      // Main surface
      ctx.beginPath();
      isGround
        ? ctx.rect(p.x, p.y, p.w, p.h)
        : ctx.roundRect(p.x, p.y, p.w, p.h, r);

      if (isGround) {
        // Tiled ground blocks
        const gc = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        gc.addColorStop(0, world.platformColor);
        gc.addColorStop(1, world.groundColor);
        ctx.fillStyle = gc;
        ctx.fill();
        // Tile lines
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let tx = 0; tx < p.w; tx += 50) {
          ctx.beginPath(); ctx.moveTo(p.x + tx, p.y); ctx.lineTo(p.x + tx, p.y + p.h); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(p.x, p.y + 20); ctx.lineTo(p.x + p.w, p.y + 20); ctx.stroke();
      } else {
        const pc = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        pc.addColorStop(0, world.platformColor + 'ff');
        pc.addColorStop(1, world.platformColor + 'cc');
        ctx.fillStyle = pc;
        ctx.fill();
      }

      // Top highlight strip
      if (!isGround) {
        ctx.beginPath();
        ctx.roundRect(p.x + 5, p.y + 3, p.w - 10, 6, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
      }

      // Accent border
      ctx.beginPath();
      isGround
        ? ctx.rect(p.x, p.y, p.w, p.h)
        : ctx.roundRect(p.x, p.y, p.w, p.h, r);
      ctx.strokeStyle = isGround ? world.accentColor + '44' : world.accentColor + '88';
      ctx.lineWidth = isGround ? 2 : 2;
      ctx.stroke();

      // Moving platform indicator arrow
      if (p.type === 'moving') {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = world.accentColor + 'cc';
        ctx.textAlign = 'center';
        const arr = p.moveDir > 0 ? '▶' : '◀';
        ctx.fillText(arr, p.x + p.w / 2, p.y + p.h - 4);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  _drawBackground(ctx, W, H) {
    const wi = this.game.state.currentWorld;
    const t = this.anim;

    if (wi === 0) {
      // Candy Kingdom — rainbow + candy clouds
      // Rainbow arc in sky
      const rainbow = ['rgba(255,100,100,0.15)', 'rgba(255,180,60,0.12)', 'rgba(255,240,80,0.12)',
                       'rgba(80,220,80,0.12)', 'rgba(80,180,255,0.12)', 'rgba(180,80,255,0.12)'];
      rainbow.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(W / 2, H + 20, 300 + i * 20, Math.PI, 0);
        ctx.strokeStyle = c;
        ctx.lineWidth = 18;
        ctx.stroke();
      });
      // Fluffy clouds
      [[80, 70], [280, 50], [500, 80], [700, 55]].forEach(([cx, cy]) => {
        const bob = Math.sin(t * 0.5 + cx * 0.01) * 4;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        [[0,0,40,22],[30,-12,35,20],[-30,-10,30,18],[60,-5,25,16]].forEach(([ox, oy, rw, rh]) => {
          ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy + bob, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
        });
      });
      // Floating candy stars
      for (let i = 0; i < 8; i++) {
        const sx = (i * 97 + t * 8) % W;
        const sy = 60 + (i * 53) % 200;
        ctx.font = '18px serif';
        ctx.globalAlpha = 0.4;
        ctx.textAlign = 'center';
        ctx.fillText(i % 2 === 0 ? '⭐' : '🍬', sx, sy);
      }
      ctx.globalAlpha = 1;

    } else if (wi === 1) {
      // Ocean Cove — bubbles and light rays
      // Light rays from surface
      ctx.globalAlpha = 0.07;
      for (let i = 0; i < 5; i++) {
        const rx = 80 + i * 160 + Math.sin(t * 0.3 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx - 60, H);
        ctx.lineTo(rx + 60, H);
        ctx.closePath();
        ctx.fillStyle = '#80d4ff';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Bubbles
      for (const bp of this.bgParticles) {
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150,220,255,${bp.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bp.x - bp.r * 0.3, bp.y - bp.r * 0.3, bp.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${bp.alpha * 0.6})`;
        ctx.fill();
      }
      // Coral silhouettes
      [[50, 455], [180, 460], [600, 450], [720, 455]].forEach(([cx, cy]) => {
        ctx.fillStyle = 'rgba(255,100,80,0.35)';
        for (let b = 0; b < 5; b++) {
          const bx = cx + b * 14 - 28;
          const bh = 15 + Math.sin(b * 1.3) * 12;
          ctx.beginPath();
          ctx.ellipse(bx, cy, 5, bh, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

    } else if (wi === 2) {
      // Star Shrine — nebula + shooting stars
      // Nebula clouds
      [[200, 100, 120, 60], [500, 150, 100, 50], [350, 200, 80, 40]].forEach(([nx, ny, rw, rh]) => {
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, rw);
        ng.addColorStop(0, 'rgba(150,50,255,0.12)');
        ng.addColorStop(1, 'rgba(50,0,100,0)');
        ctx.beginPath(); ctx.ellipse(nx, ny, rw, rh, 0, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
      });
      // Stars field
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + 20) % W;
        const sy = (i * 89 + 10) % (H - 60);
        const pulse = 0.4 + 0.6 * Math.sin(t * 2 + i * 0.8);
        ctx.globalAlpha = pulse * 0.7;
        ctx.fillStyle = i % 3 === 0 ? '#ffd700' : '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, i % 5 === 0 ? 2 : 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Moon
      ctx.beginPath(); ctx.arc(680, 80, 40, 0, Math.PI * 2);
      const moonGrad = ctx.createRadialGradient(675, 75, 5, 680, 80, 40);
      moonGrad.addColorStop(0, 'rgba(255,240,180,0.35)');
      moonGrad.addColorStop(1, 'rgba(180,150,60,0.1)');
      ctx.fillStyle = moonGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,100,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      // Glow around moon
      ctx.beginPath(); ctx.arc(680, 80, 55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,200,50,0.08)'; ctx.lineWidth = 15; ctx.stroke();

    } else if (wi === 3) {
      // Mushroom Forest — glowing mushrooms + fireflies
      // Tree silhouettes
      [[40, 460], [160, 455], [650, 460], [760, 455]].forEach(([tx, ty]) => {
        ctx.fillStyle = 'rgba(5,30,10,0.7)';
        ctx.beginPath(); ctx.rect(tx - 8, ty - 100, 16, 100); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx, ty - 100, 40, 55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx - 25, ty - 80, 28, 38, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx + 25, ty - 75, 28, 38, 0.3, 0, Math.PI * 2); ctx.fill();
      });
      // Glowing mushrooms
      [[90, 445], [230, 450], [590, 445], [700, 448]].forEach(([mx, my]) => {
        const mglow = 0.5 + 0.5 * Math.sin(t * 1.5 + mx * 0.05);
        ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 15 * mglow;
        ctx.fillStyle = `rgba(200,40,60,${0.7 + mglow * 0.3})`;
        ctx.beginPath(); ctx.ellipse(mx, my - 12, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8f8f0';
        ctx.beginPath(); ctx.roundRect(mx - 7, my - 14, 14, 20, 3); ctx.fill();
        // Polka dots
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        [[-8, -18], [0, -22], [7, -17]].forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.arc(mx + dx, my + dy, 2.5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.shadowBlur = 0;
      });
      // Fireflies
      for (const bp of this.bgParticles.slice(0, 10)) {
        const glow = 0.4 + 0.6 * Math.sin(t * 3 + bp.phase);
        ctx.globalAlpha = glow * bp.alpha * 2;
        ctx.shadowColor = '#aaff44'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(bp.x, bp.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ccff66'; ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

    } else if (wi === 4) {
      // Dragon Castle — towers + embers
      // Castle towers
      [[60, 460], [720, 460]].forEach(([tx, ty]) => {
        ctx.fillStyle = 'rgba(50,0,0,0.8)';
        ctx.beginPath(); ctx.rect(tx - 25, ty - 130, 50, 130); ctx.fill();
        // Battlements
        for (let b = 0; b < 4; b++) {
          ctx.beginPath(); ctx.rect(tx - 24 + b * 14, ty - 145, 10, 18); ctx.fill();
        }
        // Window glow
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255,140,0,0.6)';
        ctx.beginPath(); ctx.arc(tx, ty - 80, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
      // Embers / sparks floating up
      for (const bp of this.bgParticles) {
        const glow = 0.5 + 0.5 * Math.sin(t * 4 + bp.phase);
        ctx.globalAlpha = glow * bp.alpha;
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = bp.phase < Math.PI ? '#ff6600' : '#ff9900';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      // Dragon scale pattern overlay
      ctx.globalAlpha = 0.04;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 12; col++) {
          ctx.beginPath();
          ctx.arc(col * 70 + (row % 2) * 35, row * 55 + 30, 28, 0, Math.PI);
          ctx.fillStyle = '#ff4400';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}
