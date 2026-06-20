# Kawaii Math Platformer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file browser platformer where primary school children (ages 8–11) solve math equations by jumping through the correct numbered torii-gate portal.

**Architecture:** A single `index.html` loads modular JS files via `<script>` tags — no build step, no bundler. A central `Game` class owns the canvas, game loop, and scene stack. Three scenes (`WorldMap`, `Level`, `Result`) swap in/out. All visuals are drawn with Canvas 2D API; all audio is synthesised with Web Audio API.

**Tech Stack:** Vanilla HTML5, Canvas 2D API, Web Audio API, ES6 classes, no external dependencies.

## Global Constraints

- No external libraries, images, or audio files — everything generated in-browser
- Target browsers: Chrome/Edge/Firefox (evergreen) — no IE support needed
- Single canvas element sized 800×500px, centred on page
- Keyboard controls only (v1): Arrow keys / WASD + Space
- All JS files loaded via `<script>` tags in `index.html` in dependency order
- Characters and UI drawn with Canvas 2D primitives + emoji text rendering
- Equation answers are always positive integers
- Distractor answers are always plausible (near the correct answer or common mistakes)
- 5 worlds × 5 levels = 25 levels total; session-only progress (no localStorage)

---

### Task 1: HTML Scaffold + Canvas + Game Loop

**Files:**
- Create: `index.html`
- Create: `js/game.js`

**Interfaces:**
- Produces: `window.Game` class with `start()`, `switchScene(scene)`, `ctx`, `WIDTH=800`, `HEIGHT=500`, `state` object
- Produces: `window.gameState = { currentWorld, currentLevel, lives, stars, worldProgress }`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kawaii Math Adventure</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a0033; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { display: block; border-radius: 12px; box-shadow: 0 0 40px rgba(255,200,255,0.4); }
  </style>
</head>
<body>
  <canvas id="gameCanvas" width="800" height="500"></canvas>
  <script src="js/game.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/worlds.js"></script>
  <script src="js/equations.js"></script>
  <script src="js/player.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/scenes/worldmap.js"></script>
  <script src="js/scenes/level.js"></script>
  <script src="js/scenes/result.js"></script>
  <script>
    const game = new Game(document.getElementById('gameCanvas'));
    game.start();
  </script>
</body>
</html>
```

- [ ] **Step 2: Create `js/game.js`**

```js
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.WIDTH = 800;
    this.HEIGHT = 500;
    this.scene = null;
    this.lastTime = 0;
    this.keys = {};
    this.state = {
      currentWorld: 0,
      currentLevel: 0,
      lives: 3,
      stars: 0,
      worldProgress: [0, 0, 0, 0, 0]
    };
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (this.scene) this.scene.onInput(e.code, 'down');
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (this.scene) this.scene.onInput(e.code, 'up');
    });
  }

  switchScene(scene) {
    this.scene = scene;
  }

  start() {
    // placeholder: show purple screen until scenes are built
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.ctx.fillStyle = '#1a0033';
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      if (this.scene) {
        this.scene.update(dt);
        this.scene.draw(this.ctx);
      } else {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 32px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading…', 400, 250);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
```

- [ ] **Step 3: Open `index.html` in browser**

Expected: Dark purple background with white "Loading…" centred on canvas. No JS errors in console.

- [ ] **Step 4: Commit**

```bash
git init
git add index.html js/game.js
git commit -m "feat: scaffold canvas, game loop, and state"
```

---

### Task 2: Worlds Data + Equation Generator

**Files:**
- Create: `js/worlds.js`
- Create: `js/equations.js`

**Interfaces:**
- Produces: `window.WORLDS` — array of 5 world config objects
- Produces: `window.generateEquation(worldIndex, levelIndex)` → `{ display: string, answer: number, distractors: number[] }`
- `distractors` always has exactly 3 values, none equal to `answer`, all positive integers

- [ ] **Step 1: Create `js/worlds.js`**

```js
window.WORLDS = [
  {
    name: 'Candy Kingdom',
    emoji: '🍡',
    bgColor: '#FFD6E8',
    platformColor: '#FF8FAB',
    accentColor: '#A8E6CF',
    groundColor: '#FF69B4',
    skyColor: '#FFF0F5',
    musicNote: 'C5',
    operation: 'addition'
  },
  {
    name: 'Ocean Cove',
    emoji: '🌊',
    bgColor: '#003366',
    platformColor: '#006994',
    accentColor: '#00CED1',
    groundColor: '#004080',
    skyColor: '#001133',
    musicNote: 'G4',
    operation: 'subtraction'
  },
  {
    name: 'Star Shrine',
    emoji: '⭐',
    bgColor: '#1a0033',
    platformColor: '#4B0082',
    accentColor: '#FFD700',
    groundColor: '#2d0050',
    skyColor: '#0d0020',
    musicNote: 'E5',
    operation: 'multiplication'
  },
  {
    name: 'Mushroom Forest',
    emoji: '🍄',
    bgColor: '#1a3300',
    platformColor: '#2D5016',
    accentColor: '#90EE90',
    groundColor: '#142600',
    skyColor: '#0a1a00',
    musicNote: 'A4',
    operation: 'division'
  },
  {
    name: 'Dragon Castle',
    emoji: '🏯',
    bgColor: '#1a0000',
    platformColor: '#5c0000',
    accentColor: '#FFB6C1',
    groundColor: '#3a0000',
    skyColor: '#0d0000',
    musicNote: 'D5',
    operation: 'mixed'
  }
];
```

- [ ] **Step 2: Create `js/equations.js`**

```js
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDistractors(answer, rand, count = 3) {
  const offsets = [-3, -2, -1, 1, 2, 3, 5, -5, 10, -10];
  const distractors = new Set();
  const shuffled = offsets.slice().sort(() => rand() - 0.5);
  for (const off of shuffled) {
    const candidate = answer + off;
    if (candidate > 0 && candidate !== answer && !distractors.has(candidate)) {
      distractors.add(candidate);
      if (distractors.size === count) break;
    }
  }
  // fallback if not enough unique distractors
  let fallback = answer + 7;
  while (distractors.size < count) {
    if (fallback !== answer) distractors.add(fallback);
    fallback++;
  }
  return Array.from(distractors);
}

window.generateEquation = function(worldIndex, levelIndex) {
  const seed = worldIndex * 100 + levelIndex + 1;
  const rand = seededRand(seed);
  const world = WORLDS[worldIndex];
  const op = world.operation;
  let a, b, answer, display;

  if (op === 'addition') {
    a = Math.floor(rand() * 50) + 10;
    b = Math.floor(rand() * 50) + 10;
    answer = a + b;
    display = `${a} + ${b} = ?`;
  } else if (op === 'subtraction') {
    a = Math.floor(rand() * 50) + 30;
    b = Math.floor(rand() * (a - 1)) + 1;
    answer = a - b;
    display = `${a} − ${b} = ?`;
  } else if (op === 'multiplication') {
    a = Math.floor(rand() * 12) + 1;
    b = Math.floor(rand() * 12) + 1;
    answer = a * b;
    display = `${a} × ${b} = ?`;
  } else if (op === 'division') {
    b = Math.floor(rand() * 9) + 2;
    answer = Math.floor(rand() * 10) + 2;
    a = b * answer;
    display = `${a} ÷ ${b} = ?`;
  } else {
    // mixed: (a × b) + c  or  a × b − c
    a = Math.floor(rand() * 9) + 2;
    b = Math.floor(rand() * 9) + 2;
    const c = Math.floor(rand() * 20) + 1;
    const useAdd = rand() > 0.5;
    answer = useAdd ? (a * b) + c : (a * b) - c;
    display = useAdd ? `(${a} × ${b}) + ${c} = ?` : `(${a} × ${b}) − ${c} = ?`;
    if (answer <= 0) { answer = a * b + c; display = `(${a} × ${b}) + ${c} = ?`; }
  }

  return { display, answer, distractors: generateDistractors(answer, rand) };
};
```

- [ ] **Step 3: Verify in browser console**

Open browser DevTools console and run:
```js
generateEquation(0, 0)  // should return { display: "XX + XX = ?", answer: number, distractors: [3 numbers] }
generateEquation(2, 3)  // should return multiplication equation
generateEquation(3, 1)  // should return division equation with no remainders
```
Expected: objects with `display`, `answer`, and 3 distractors, none equal to answer.

- [ ] **Step 4: Commit**

```bash
git add js/worlds.js js/equations.js
git commit -m "feat: worlds config and equation generator"
```

---

### Task 3: Audio System

**Files:**
- Create: `js/audio.js`

**Interfaces:**
- Produces: `window.Audio` object with methods: `jump()`, `stomp()`, `wrong()`, `correct()`, `lifeLost()`, `startMusic(worldIndex)`, `stopMusic()`

- [ ] **Step 1: Create `js/audio.js`**

```js
window.Audio = (() => {
  let ctx = null;
  let musicNodes = [];

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq, type, duration, gain = 0.3, delay = 0) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gainNode.gain.setValueAtTime(gain, ac.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  }

  const noteFreqs = { C4:261.6, D4:293.7, E4:329.6, G4:392, A4:440, C5:523.3, D5:587.3, E5:659.3, G5:784 };

  return {
    jump()    { beep(400, 'square', 0.12, 0.2); beep(600, 'square', 0.08, 0.15, 0.05); },
    stomp()   { beep(200, 'square', 0.1, 0.3); beep(150, 'square', 0.15, 0.25, 0.08); },
    wrong()   { beep(180, 'sawtooth', 0.3, 0.4); beep(150, 'sawtooth', 0.3, 0.3, 0.15); },
    lifeLost(){ beep(300, 'sawtooth', 0.2, 0.3); beep(200, 'sawtooth', 0.3, 0.3, 0.1); beep(150, 'sawtooth', 0.4, 0.35, 0.25); },
    correct() {
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 'square', 0.15, 0.3, i * 0.07));
    },
    startMusic(worldIndex) {
      this.stopMusic();
      const ac = getCtx();
      const scales = [
        [261.6, 293.7, 329.6, 392, 440],   // C major (candy)
        [220, 246.9, 261.6, 293.7, 329.6], // A minor (ocean)
        [392, 440, 493.9, 523.3, 587.3],   // G major (star)
        [174.6, 196, 220, 261.6, 293.7],   // F major (forest)
        [293.7, 329.6, 369.9, 415.3, 466.2] // D phrygian (castle)
      ];
      const scale = scales[worldIndex] || scales[0];
      const pattern = [0, 2, 4, 2, 1, 3, 4, 3];
      const tempo = 0.35;
      pattern.forEach((noteIdx, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g);
        g.connect(ac.destination);
        osc.type = 'square';
        osc.frequency.value = scale[noteIdx];
        g.gain.value = 0;
        osc.start();
        // pulse on/off in pattern loop
        const loopLen = pattern.length * tempo;
        for (let rep = 0; rep < 60; rep++) {
          const t = ac.currentTime + rep * loopLen + i * tempo;
          g.gain.setValueAtTime(0.06, t);
          g.gain.setValueAtTime(0, t + tempo * 0.7);
        }
        musicNodes.push({ osc, g });
      });
    },
    stopMusic() {
      musicNodes.forEach(({ osc }) => { try { osc.stop(); } catch(e) {} });
      musicNodes = [];
    }
  };
})();
```

- [ ] **Step 2: Test in browser console**

After opening `index.html`:
```js
Audio.jump()    // should play a quick ascending bloop
Audio.correct() // should play a 4-note ascending fanfare
Audio.wrong()   // should play a descending buzz
Audio.startMusic(0) // should play a looping melody
Audio.stopMusic()
```
Expected: distinct sounds for each call, no errors.

- [ ] **Step 3: Commit**

```bash
git add js/audio.js
git commit -m "feat: web audio sound effects and procedural music"
```

---

### Task 4: Player Entity

**Files:**
- Create: `js/player.js`

**Interfaces:**
- Produces: `new Player(x, y)` with:
  - `.update(dt, keys, platforms)` — applies gravity, movement, jump, collision
  - `.draw(ctx)` — draws kawaii tanuki
  - `.x, .y, .w=32, .h=36, .vy, .onGround, .alive, .invincible`
  - `.takeDamage()` — triggers invincibility frames
  - `.celebrate()` — triggers celebrate animation

- [ ] **Step 1: Create `js/player.js`**

```js
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

    const speed = 180;
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
```

- [ ] **Step 2: Quick smoke test — add to `index.html` temporarily**

At bottom of `<script>` block in index.html, after `game.start()`, add:
```js
// TEMP TEST — remove after verifying
const testPlayer = new Player(100, 200);
const origStart = game.start.bind(game);
```

Actually, skip inline modification — verify visually in Task 9 when the full level scene is built. Instead, verify the class loads without errors:

Open browser console after loading `index.html` and run:
```js
const p = new Player(100, 200);
console.log(p.w, p.h, p.onGround); // 32 36 false
```
Expected: `32 36 false` with no errors.

- [ ] **Step 3: Commit**

```bash
git add js/player.js
git commit -m "feat: kawaii tanuki player with physics and canvas drawing"
```

---

### Task 5: Enemies

**Files:**
- Create: `js/enemies.js`

**Interfaces:**
- Produces: `new Enemy(x, y, patrolLeft, patrolRight)` with:
  - `.update(dt)` — patrol left/right
  - `.draw(ctx, worldIndex)` — draws chibi onigiri / mochi
  - `.x, .y, .w=28, .h=28, .alive`
  - `.checkStomp(player)` → `boolean` — returns true if player stomped this enemy (player vy > 0, feet overlap enemy top)
  - `.checkHit(player)` → `boolean` — returns true if player side-collides with enemy

- [ ] **Step 1: Create `js/enemies.js`**

```js
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
```

- [ ] **Step 2: Verify in browser console**

```js
const e = new Enemy(100, 200, 50, 250);
console.log(e.w, e.h, e.alive); // 28 28 true
e.update(0.016);
console.log(Math.round(e.x)); // ~101 (moved right)
```
Expected: values logged, no errors.

- [ ] **Step 3: Commit**

```bash
git add js/enemies.js
git commit -m "feat: chibi onigiri enemy with patrol and stomp detection"
```

---

### Task 6: World Map Scene

**Files:**
- Create: `js/scenes/worldmap.js`

**Interfaces:**
- Consumes: `WORLDS`, `window.game.state`, `window.game.switchScene`
- Produces: `new WorldMapScene(game)` implementing `{ update(dt), draw(ctx), onInput(code, type) }`
- On world select: calls `game.switchScene(new LevelScene(game))` (LevelScene not yet built — can be a stub that logs)

- [ ] **Step 1: Create `js/scenes/worldmap.js`** (also create `js/scenes/` directory)

```js
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
```

- [ ] **Step 2: Wire WorldMapScene as starting scene in `game.js`**

In `js/game.js`, add to the end of the `start()` method, before the `requestAnimationFrame(loop)` line:

```js
// replace the placeholder "Loading..." with the world map
// (scenes will be defined by the time scripts load)
setTimeout(() => {
  if (typeof WorldMapScene !== 'undefined') {
    this.switchScene(new WorldMapScene(this));
  }
}, 0);
```

- [ ] **Step 3: Open browser and verify**

Expected:
- Dark starfield background with twinkling stars
- Title "🌸 Kawaii Math Adventure 🌸" in gold
- 5 world nodes in a row; Candy Kingdom selected (glowing)
- Left/right arrows move selection; Space logs to console (LevelScene stub)

- [ ] **Step 4: Commit**

```bash
git add js/scenes/worldmap.js js/game.js
git commit -m "feat: world map scene with world selection"
```

---

### Task 7: Portals (Torii Gates)

**Files:**
- Create: `js/scenes/portals.js`

**Interfaces:**
- Produces: `new Portal(x, y, number, isCorrect)` with:
  - `.draw(ctx, accentColor)` — draws torii gate silhouette with number
  - `.checkEntry(player)` → `boolean` — player overlaps portal entrance
  - `.x, .y, .w=60, .h=80, .number, .isCorrect`
  - `.flash(type)` — triggers 'correct' or 'wrong' visual flash (timer-based)

- [ ] **Step 1: Create `js/scenes/portals.js`**

```js
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
    const portalGrad = ctx.createLinearGradient(x + 16, y + 28, x + w - 16, y + h);
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
```

- [ ] **Step 2: Add `<script src="js/scenes/portals.js">` to `index.html`**

Add before the worldmap script tag:
```html
<script src="js/scenes/portals.js"></script>
```

- [ ] **Step 3: Verify in browser console**

```js
const p = new Portal(100, 400, 42, true);
console.log(p.w, p.isCorrect); // 60 true
```
Expected: `60 true` with no errors.

- [ ] **Step 4: Commit**

```bash
git add js/scenes/portals.js index.html
git commit -m "feat: torii gate portal with shimmer and flash effects"
```

---

### Task 8: Level Scene

**Files:**
- Create: `js/scenes/level.js`

**Interfaces:**
- Consumes: `Player`, `Enemy`, `Portal`, `generateEquation`, `WORLDS`, `Audio`, `game.state`
- Produces: `new LevelScene(game)` implementing `{ update(dt), draw(ctx), onInput(code, type) }`
- On level complete: increments `game.state.currentLevel`, switches to `ResultScene` with `{ win: true }`
- On lives exhausted: switches to `ResultScene` with `{ win: false }`

- [ ] **Step 1: Create `js/scenes/level.js`**

```js
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
  }

  _buildPlatforms() {
    // ground + 6 floating platforms; layout shifts each level
    const level = this.game.state.currentLevel;
    const seed = (this.game.state.currentWorld * 5 + level) * 7;
    const rand = () => { let s = seed + (rand._i = (rand._i || 0) + 1); return ((s * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff; };
    const platforms = [{ x: 0, y: 460, w: 800, h: 40 }]; // ground
    const xs = [60, 180, 300, 450, 580, 680];
    const ys = [370, 310, 260, 330, 280, 350];
    for (let i = 0; i < 6; i++) {
      platforms.push({ x: xs[i] + (rand() * 40 - 20) | 0, y: ys[i] + (rand() * 30 - 15) | 0, w: 100 + (rand() * 40) | 0, h: 18 });
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
    const { answer, distractors } = this.eq;
    const numbers = [answer, ...distractors];
    // shuffle with seeded rand
    const seed = this.game.state.currentWorld * 100 + this.game.state.currentLevel + 999;
    let s = seed;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const portalY = 380;
    const spacing = 800 / 5;
    return numbers.map((num, i) => new Portal(spacing * (i + 1) - 30, portalY, num, num === answer));
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

    // player
    this.player.update(dt, this.game.keys, this.platforms);

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
        this.game.state.stars++;
        Audio.stomp();
        this._spawnParticles(enemy.x + 14, enemy.y + 14, '#FFD700', 8);
      } else if (enemy.checkHit(this.player)) {
        if (this.player.takeDamage()) {
          this.game.state.lives--;
          Audio.lifeLost();
          this.screenFlash = '#ff000066';
          this.screenFlashTimer = 0.5;
          if (this.game.state.lives <= 0) {
            setTimeout(() => this.game.switchScene(new ResultScene(this.game, false)), 800);
          }
        }
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
    if (this.player.invincible) return;
    this.game.state.lives--;
    if (this.game.state.lives <= 0) {
      Audio.lifeLost();
      setTimeout(() => this.game.switchScene(new ResultScene(this.game, false)), 800);
    } else {
      Audio.lifeLost();
      // respawn
      this.player = new Player(80, 300);
    }
  }

  _levelComplete() {
    const w = this.game.state.currentWorld;
    const l = this.game.state.currentLevel;
    this.game.state.worldProgress[w] = Math.max(this.game.state.worldProgress[w], l + 1);
    this.game.state.currentLevel++;
    this.game.switchScene(new ResultScene(this.game, true));
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
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, p.h === 40 ? 0 : 8);
      ctx.fillStyle = world.platformColor;
      ctx.fill();
      ctx.strokeStyle = world.accentColor + '66';
      ctx.lineWidth = 2;
      ctx.stroke();
      // top shine
      ctx.beginPath();
      ctx.roundRect(p.x + 4, p.y + 2, p.w - 8, 4, 2);
      ctx.fillStyle = world.accentColor + '33';
      ctx.fill();
    }

    // portals
    for (const p of this.portals) p.draw(ctx, world.accentColor);

    // enemies
    for (const e of this.enemies) e.draw(ctx, this.game.state.currentWorld);

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

    // world/level indicator
    ctx.font = '12px sans-serif';
    ctx.fillStyle = this.world.accentColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${this.world.emoji} ${this.world.name}  L${this.game.state.currentLevel + 1}/5`, W - 10, 52);

    ctx.textAlign = 'left';
  }
}
```

- [ ] **Step 2: Open browser and play a level**

Select a world on the world map (Space). Expected:
- Level renders with world-themed background, platforms, enemies, portals
- Tanuki character visible; moves with arrow keys, jumps with Space
- Equation displayed in HUD bar
- Hearts and star counter visible
- Entering wrong portal: red flash + life lost
- Entering correct portal: sparkles + fanfare + transitions (ResultScene stub message in console)

- [ ] **Step 3: Commit**

```bash
git add js/scenes/level.js
git commit -m "feat: full level scene with physics, enemies, portals, HUD"
```

---

### Task 9: Result Scene + Game Over + Win Screen

**Files:**
- Create: `js/scenes/result.js`

**Interfaces:**
- Consumes: `game.state`, `WORLDS`, `Audio`
- `new ResultScene(game, win)` — `win=true` for level/world complete, `win=false` for game over
- On continue (Space/Enter): if win && more levels → new LevelScene; if win && world done → WorldMapScene; if !win → reset lives, new LevelScene retry

- [ ] **Step 1: Create `js/scenes/result.js`**

```js
class ResultScene {
  constructor(game, win) {
    this.game = game;
    this.win = win;
    this.anim = 0;
    this.particles = [];
    if (win) {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: 400 + Math.random() * 200 - 100,
          y: 250 + Math.random() * 100 - 50,
          vx: Math.cos(angle) * (60 + Math.random() * 120),
          vy: Math.sin(angle) * (60 + Math.random() * 120) - 80,
          life: 1.5, maxLife: 1.5,
          color: ['#FFD700','#FF69B4','#00CED1','#90EE90'][Math.floor(Math.random()*4)],
          r: 5 + Math.random() * 8,
          emoji: ['⭐','🌸','✨','💫'][Math.floor(Math.random()*4)]
        });
      }
    }
  }

  update(dt) {
    this.anim += dt;
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 150 * dt; p.life -= dt;
      return p.life > 0;
    });
  }

  onInput(code, type) {
    if (type !== 'down') return;
    if (code === 'Space' || code === 'Enter') this._continue();
  }

  _continue() {
    const s = this.game.state;
    if (!this.win) {
      s.lives = 3;
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new LevelScene(this.game));
      return;
    }
    const worldDone = s.currentLevel >= 5;
    const allDone = worldDone && s.currentWorld >= 4;
    if (allDone) {
      // reset for replay
      s.currentWorld = 0; s.currentLevel = 0; s.lives = 3;
      Audio.stopMusic();
      this.game.switchScene(new WorldMapScene(this.game));
    } else if (worldDone) {
      s.currentWorld++;
      s.currentLevel = 0;
      s.lives = 3;
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new WorldMapScene(this.game));
    } else {
      Audio.startMusic(s.currentWorld);
      this.game.switchScene(new LevelScene(this.game));
    }
  }

  draw(ctx) {
    const W = this.game.WIDTH, H = this.game.HEIGHT;
    const world = WORLDS[this.game.state.currentWorld];

    // dimmed background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.font = `${Math.round(p.r * 2.5)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // card
    const cardW = 480, cardH = 280;
    const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
    ctx.fillStyle = this.win ? '#1a0033' : '#330000';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = this.win ? world.accentColor : '#ff4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';

    if (this.win) {
      const worldDone = this.game.state.currentLevel >= 5;
      const allDone = worldDone && this.game.state.currentWorld >= 4;
      const pulse = 1 + 0.05 * Math.sin(this.anim * 4);
      ctx.save();
      ctx.translate(W/2, cardY + 80);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText(allDone ? '🎉 YOU WIN! 🎉' : worldDone ? '🌟 World Complete! 🌟' : '✨ Level Clear! ✨', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(allDone
        ? "You're a Math Master! Amazing!"
        : worldDone
        ? `${WORLDS[this.game.state.currentWorld + 1]?.name ?? 'All worlds'} unlocked!`
        : `Next up: Level ${this.game.state.currentLevel + 1}`, W/2, cardY + 145);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = world.accentColor;
      ctx.fillText(`⭐ Stars collected: ${this.game.state.stars}`, W/2, cardY + 185);
    } else {
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#ff6666';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.fillText('💔 Oh No! 💔', W/2, cardY + 90);
      ctx.shadowBlur = 0;

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#ffaaaa';
      ctx.fillText('Out of lives! Try again?', W/2, cardY + 145);

      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#ff9999';
      ctx.fillText(`Equation: ${generateEquation(this.game.state.currentWorld, this.game.state.currentLevel - 1 < 0 ? 0 : this.game.state.currentLevel).display}`, W/2, cardY + 185);
    }

    // press space hint
    const blink = Math.sin(this.anim * 3) > 0;
    if (blink) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press Space to continue', W/2, cardY + cardH - 28);
    }
  }
}
```

- [ ] **Step 2: Full playthrough test in browser**

Play through a level:
- Complete level correctly → Level Clear screen → Space → next level
- Lose all lives → Oh No screen → Space → retry same level with 3 lives
- Complete all 5 levels of a world → World Complete → Space → World Map with next world unlocked

- [ ] **Step 3: Commit**

```bash
git add js/scenes/result.js
git commit -m "feat: result scene with win/lose states and particle celebration"
```

---

### Task 10: Final Polish & Wiring

**Files:**
- Modify: `js/game.js` — clean up placeholder, wire initial scene properly
- Modify: `index.html` — ensure all script tags in correct dependency order

**Interfaces:** None new — this task is integration only.

- [ ] **Step 1: Update `js/game.js` to start on WorldMapScene cleanly**

Replace the `start()` method with:

```js
start() {
  const loop = (timestamp) => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.ctx.fillStyle = '#1a0033';
    this.ctx.fillRect(0, 0, this.game ? this.game.WIDTH : 800, this.scene ? 800 : 800);
    if (this.scene) {
      this.scene.update(dt);
      this.scene.draw(this.ctx);
    }
    requestAnimationFrame(loop);
  };
  this.switchScene(new WorldMapScene(this));
  requestAnimationFrame(loop);
}
```

- [ ] **Step 2: Verify `index.html` script order**

Scripts must load in this order (dependencies first):
```html
<script src="js/game.js"></script>
<script src="js/audio.js"></script>
<script src="js/worlds.js"></script>
<script src="js/equations.js"></script>
<script src="js/player.js"></script>
<script src="js/enemies.js"></script>
<script src="js/scenes/portals.js"></script>
<script src="js/scenes/worldmap.js"></script>
<script src="js/scenes/result.js"></script>
<script src="js/scenes/level.js"></script>
```

Update `index.html` to match this order exactly (portals before worldmap; result before level — LevelScene references ResultScene).

- [ ] **Step 3: Full end-to-end play test**

Open `index.html` in browser and verify:
- [ ] World map shows 5 worlds; Candy Kingdom selected
- [ ] Arrow keys navigate world selection
- [ ] Space starts Candy Kingdom level 1
- [ ] Addition equation shown in HUD
- [ ] Player moves, jumps, lands on platforms
- [ ] Enemies patrol; stomping awards a star
- [ ] Correct portal: celebration + next level
- [ ] Wrong portal: red flash + life lost
- [ ] 0 lives: Oh No screen → retry restores 3 lives
- [ ] Complete 5 levels: World Complete → World Map → next world unlocked
- [ ] Star Shrine (world 3): multiplication equations
- [ ] Dragon Castle (world 5): mixed operation equations
- [ ] Audio plays for all events (may need first click to unlock AudioContext)

- [ ] **Step 4: Final commit**

```bash
git add index.html js/game.js
git commit -m "feat: complete kawaii math platformer - all scenes wired, 25 levels"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| 5 themed worlds × 5 levels | Task 2 (worlds.js), Task 8 (level.js `_levelComplete`) |
| Math operations per world | Task 2 (equations.js) |
| Plausible distractors | Task 2 (`generateDistractors`) |
| Torii gate portals | Task 7 (portals.js) |
| Correct/wrong portal feedback | Task 7 (`flash()`), Task 8 (`update`) |
| Kawaii tanuki player | Task 4 (player.js) |
| Chibi onigiri enemies | Task 5 (enemies.js) |
| Stomp = +star, hit = -life | Task 8 (level.js `update`) |
| 3 lives / hearts HUD | Task 8 (`_drawHUD`), Task 9 (result.js) |
| Star counter HUD | Task 8 (`_drawHUD`) |
| Equation speech bubble | Task 8 (`_drawHUD`) |
| Per-world palette + bg deco | Task 8 (`_drawBackground`) |
| Web Audio sound effects | Task 3 (audio.js) |
| Procedural background music | Task 3 (`startMusic`) |
| World map with unlock | Task 6 (worldmap.js) |
| Win / Game Over screens | Task 9 (result.js) |
| No external assets/libraries | All tasks — Canvas + Web Audio only |

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:** `Portal`, `Player`, `Enemy`, `WorldMapScene`, `LevelScene`, `ResultScene`, `WORLDS`, `generateEquation`, `Audio` — all names consistent across tasks.
