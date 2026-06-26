const POWERUP_DEFS = {
  speed:      { emoji: '🥾', label: 'Speed!',   color: '#00ff88' },
  doublejump: { emoji: '🍄', label: '+Jump!',   color: '#ff88ff' },
  shield:     { emoji: '🛡️', label: 'Shield!',  color: '#88ccff' },
  multiplier: { emoji: '⭐', label: '×2 Stars!', color: '#FFD700' }
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.collected = false;
    this.bobOffset = 0;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.w = 28;
    this.h = 28;
  }

  update(dt) {
    this.bobTimer += dt * 3;
    this.bobOffset = Math.sin(this.bobTimer) * 5;
  }

  draw(ctx) {
    if (this.collected) return;
    const def = POWERUP_DEFS[this.type];
    // glow
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 12;
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.emoji, this.x + this.w / 2, this.y + this.bobOffset + 22);
    ctx.shadowBlur = 0;
  }

  checkCollect(player) {
    if (this.collected) return false;
    const overlap =
      player.x < this.x + this.w && player.x + player.w > this.x &&
      player.y < this.y + this.h && player.y + player.h > this.y;
    if (overlap) { this.collected = true; return true; }
    return false;
  }
}
