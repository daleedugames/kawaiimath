# Kawaii Math Adventure — Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the game with 10 levels/world, 3-star rating, localStorage persistence, power-ups, moving/disappearing platforms, new equation types, and visual hints.

**Architecture:** Vanilla JS, no build step. All files loaded via `<script>` tags in `index.html`. New files `js/save.js`, `js/powerups.js`, `js/scenes/hud.js` are created and added to index.html. Existing files are modified in-place. No module system — globals are the interface.

**Tech Stack:** Vanilla JS (ES6), HTML5 Canvas, localStorage.

## Global Constraints

- No build step, no npm, no external libraries — plain `<script>` tags only
- Canvas size: 800×500, coordinate system unchanged
- Seeded RNG (`seededRand`) used for all deterministic randomness
- Worlds array has 5 entries (indices 0–4); levels are 0-indexed internally, displayed as 1-indexed
- After changes, 10 levels per world (was 5); challenge levels are levels at index 4 and 9 (5th and 10th)
- `window.` prefix required for any global that must be visible across files
- No TypeScript, no JSDoc required

---

## File Structure

**New files:**
- `js/save.js` — localStorage load/save for star ratings and world progress
- `js/powerups.js` — PowerUp class (spawn, update, draw, apply-to-player)
- `js/scenes/hud.js` — HUD drawing extracted from LevelScene

**Modified files:**
- `index.html` — add `<script>` tags for three new files (before `js/game.js`)
- `js/equations.js` — difficulty scaling by level position, missing-number and missing-operator types, 6-portal distractor count for challenge levels
- `js/worlds.js` — no structural changes
- `js/game.js` — extend `state` with `levelStars` map, `livesLostThisLevel`, `levelStartTime`; load/save via Save module; worldProgress ceiling raised to 10
- `js/player.js` — add `speed` multiplier, `extraJumps`/`extraJumpsLeft`, `shieldActive`, `starMultiplier`/`starMultiplierTimer` fields; apply them in `update()` and `takeDamage()`
- `js/scenes/level.js` — moving/disappearing platform logic, power-up spawning/collision, challenge-level timer, 6-portal support, call HUD from hud.js, track livesLostThisLevel
- `js/scenes/result.js` — compute 1–3 star rating, show earned vs personal best, save via Save
- `js/scenes/worldmap.js` — show per-level star icons, change unlock threshold to 10, show 10-level progress

---

## Task 1: save.js — localStorage persistence

**Files:**
- Create: `js/save.js`
- Modify: `index.html` (add script tag)
- Modify: `js/game.js` (load on start, save after level)

**Interfaces:**
- Produces: `window.Save.load()` → `{ worldProgress: number[5], levelStars: Object<"w_l", 1|2|3> }`, `window.Save.save(state)` → void, `window.Save.getBestStars(w, l)` → `0|1|2|3`

- [ ] **Step 1: Create js/save.js**

```js
window.Save = (() => {
  const KEY = 'kawaii_math_save';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return _defaults();
      const data = JSON.parse(raw);
      return {
        worldProgress: data.worldProgress || [0,0,0,0,0],
        levelStars: data.levelStars || {}
      };
    } catch(e) {
      return _defaults();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        worldProgress: state.worldProgress,
        levelStars: state.levelStars || {}
      }));
    } catch(e) {}
  }

  function getBestStars(w, l) {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      return (data.levelStars || {})[`${w}_${l}`] || 0;
    } catch(e) { return 0; }
  }

  function _defaults() {
    return { worldProgress: [0,0,0,0,0], levelStars: {} };
  }

  return { load, save, getBestStars };
})();
```

- [ ] **Step 2: Add script tag to index.html**

Open `index.html`. Find where the other `<script src="js/...">` tags are. Add this line **before** `js/game.js`:
```html
<script src="js/save.js"></script>
```

- [ ] **Step 3: Update game.js state initialisation to load from Save**

In `js/game.js`, replace the `state` initializer and add `levelStars` + tracking fields:

```js
// replace the this.state = { ... } block:
const saved = window.Save ? window.Save.load() : { worldProgress: [0,0,0,0,0], levelStars: {} };
this.state = {
  currentWorld: 0,
  currentLevel: 0,
  lives: 3,
  stars: 0,
  worldProgress: saved.worldProgress,
  levelStars: saved.levelStars,   // key "w_l" → 1|2|3
  livesLostThisLevel: 0,
  levelStartTime: 0
};
```

- [ ] **Step 4: Verify in browser**

Open `index.html` in browser. Open DevTools console. Run:
```js
window.Save.save({ worldProgress: [3,0,0,0,0], levelStars: { '0_0': 2 } });
console.log(window.Save.load());
```
Expected: `{ worldProgress: [3,0,0,0,0], levelStars: { '0_0': 2 } }`

- [ ] **Step 5: Commit**

```bash
git add js/save.js index.html js/game.js
git commit -m "feat: add Save module with localStorage persistence"
```

---

## Task 2: Equation enhancements — 10 levels, difficulty scaling, new types

**Files:**
- Modify: `js/equations.js`

**Interfaces:**
- Consumes: `WORLDS[worldIndex].operation`
- Produces: `window.generateEquation(worldIndex, levelIndex)` → `{ display: string, answer: number, distractors: number[], portalCount: number }`
  - `portalCount` is 6 for challenge levels (levelIndex % 5 === 4), 4 otherwise

- [ ] **Step 1: Rewrite js/equations.js**

```js
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDistractors(answer, rand, count) {
  const offsets = [-3, -2, -1, 1, 2, 3, 5, -5, 10, -10];
  const distractors = new Set();
  const shuffled = offsets.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (const off of shuffled) {
    const candidate = answer + off;
    if (candidate > 0 && candidate !== answer && !distractors.has(candidate)) {
      distractors.add(candidate);
      if (distractors.size === count) break;
    }
  }
  let fallback = answer + 7;
  while (distractors.size < count) {
    if (fallback !== answer) distractors.add(fallback);
    fallback++;
  }
  return Array.from(distractors);
}

// t = 0..1 within a world's 10 levels (levelIndex / 9)
function _diffScale(rand, min1, max1, min2, max2, t) {
  const mn = min1 + (min2 - min1) * t;
  const mx = max1 + (max2 - max1) * t;
  return Math.floor(rand() * (mx - mn + 1)) + mn;
}

window.generateEquation = function(worldIndex, levelIndex) {
  const seed = worldIndex * 100 + levelIndex + 1;
  const rand = seededRand(seed);
  const world = WORLDS[worldIndex];
  const op = world.operation;
  const isChallenge = levelIndex % 5 === 4; // 5th and 10th levels
  const portalCount = isChallenge ? 6 : 4;
  const distractorCount = portalCount - 1;
  const t = Math.min(levelIndex / 9, 1); // 0=easy, 1=hard

  let a, b, answer, display;

  if (op === 'addition') {
    // easy: 1–20 + 1–20; hard: 20–99 + 20–99
    a = _diffScale(rand, 1, 20, 20, 99, t);
    b = _diffScale(rand, 1, 20, 20, 99, t);
    answer = a + b;
    display = `${a} + ${b} = ?`;
  } else if (op === 'subtraction') {
    // easy: minuend 10–30; hard: 40–99
    a = _diffScale(rand, 10, 30, 40, 99, t);
    b = Math.floor(rand() * (a - 1)) + 1;
    answer = a - b;
    display = `${a} − ${b} = ?`;
  } else if (op === 'multiplication') {
    // easy: ×2–×5; hard: ×7–×12
    a = _diffScale(rand, 2, 5, 7, 12, t);
    b = _diffScale(rand, 2, 5, 7, 12, t);
    answer = a * b;
    display = `${a} × ${b} = ?`;
  } else if (op === 'division') {
    // easy: divisor 2–5; hard: 6–12
    b = _diffScale(rand, 2, 5, 6, 12, t);
    answer = _diffScale(rand, 2, 9, 2, 12, t);
    a = b * answer;
    display = `${a} ÷ ${b} = ?`;
  } else if (op === 'mixed') {
    // keep existing mixed logic, vary c range
    a = Math.floor(rand() * 9) + 2;
    b = Math.floor(rand() * 9) + 2;
    const cMax = Math.floor(10 + t * 30);
    const c = Math.floor(rand() * cMax) + 1;
    const useAdd = rand() > 0.5;
    answer = useAdd ? (a * b) + c : (a * b) - c;
    if (answer <= 0) { answer = a * b + c; display = `(${a} × ${b}) + ${c} = ?`; }
    else display = useAdd ? `(${a} × ${b}) + ${c} = ?` : `(${a} × ${b}) − ${c} = ?`;
  }

  // Every 3rd level within a world: use missing-number or missing-operator type
  // levelIndex 2,3,7,8 → missing-number; levelIndex 1,6 → missing-operator
  // (only for addition/subtraction worlds for clarity)
  const useVariant = (op === 'addition' || op === 'subtraction') && rand() < (t * 0.5);
  if (useVariant) {
    const variantType = rand() < 0.5 ? 'missing-number' : 'missing-operator';
    if (variantType === 'missing-number' && op === 'addition') {
      // ? + b = answer   or   a + ? = answer
      const showLeft = rand() < 0.5;
      display = showLeft ? `? + ${b} = ${answer}` : `${a} + ? = ${answer}`;
    } else if (variantType === 'missing-operator') {
      // a □ b = answer where □ is + or -
      display = `${a} □ ${b} = ${answer}`;
      // answer stays the same (a + b), distractors will be wrong answers
    }
  }

  return { display, answer, distractors: generateDistractors(answer, rand, distractorCount), portalCount };
};
```

- [ ] **Step 2: Verify in browser console**

```js
// Challenge level (index 4): 6 portals
const eq4 = generateEquation(0, 4);
console.assert(eq4.portalCount === 6, 'challenge level should have 6 portals');
console.assert(eq4.distractors.length === 5, 'should have 5 distractors');

// Normal level (index 0): 4 portals
const eq0 = generateEquation(0, 0);
console.assert(eq0.portalCount === 4, 'normal level should have 4 portals');
console.assert(eq0.distractors.length === 3, 'should have 3 distractors');

console.log('Level 0:', eq0.display, '| answer:', eq0.answer);
console.log('Level 9:', generateEquation(0, 9).display);
```
Expected: assertions pass, level 9 numbers visibly larger than level 0.

- [ ] **Step 3: Commit**

```bash
git add js/equations.js
git commit -m "feat: equation difficulty scaling, missing-number/operator variants, 6-portal challenge levels"
```

---

## Task 3: Raise level count to 10, update level/worldmap/result references

**Files:**
- Modify: `js/scenes/level.js` (level count references)
- Modify: `js/scenes/result.js` (worldDone check, level count display)
- Modify: `js/scenes/worldmap.js` (unlock threshold, progress display)

**Interfaces:**
- Consumes: `game.state.currentLevel` (0-indexed, max 9 per world)

- [ ] **Step 1: Update level.js HUD level indicator**

In `js/scenes/level.js`, find `_drawHUD`. Change:
```js
// OLD:
ctx.fillText(`${this.world.emoji} ${this.world.name}  L${this.game.state.currentLevel + 1}/5`, W - 10, 52);
// NEW:
ctx.fillText(`${this.world.emoji} ${this.world.name}  L${this.game.state.currentLevel + 1}/10`, W - 10, 52);
```

- [ ] **Step 2: Update result.js worldDone check**

In `js/scenes/result.js`, find `_continue()`. Change:
```js
// OLD:
const worldDone = s.currentLevel >= 5;
// NEW:
const worldDone = s.currentLevel >= 10;
```

Also update the draw method — find the `worldDone` check in `draw()` and update the same way:
```js
// OLD:
const worldDone = this.game.state.currentLevel >= 5;
// NEW:
const worldDone = this.game.state.currentLevel >= 10;
```

- [ ] **Step 3: Update worldmap.js unlock threshold and progress display**

In `js/scenes/worldmap.js`, find the unlock check:
```js
// OLD:
const isUnlocked = i === 0 || this.game.state.worldProgress[i - 1] >= 5;
// NEW:
const isUnlocked = i === 0 || this.game.state.worldProgress[i - 1] >= 10;
```

Find the progress label:
```js
// OLD:
ctx.fillText(`${prog}/5 ⭐`, nx, nodeY + 73);
// NEW:
ctx.fillText(`${prog}/10 ⭐`, nx, nodeY + 73);
```

- [ ] **Step 4: Update _buildPortals in level.js to use portalCount**

In `_buildPortals()`, the method currently hard-codes 4 portals and spacing of `800/5`. Rewrite it to use `eq.portalCount`:

```js
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
```

- [ ] **Step 5: Verify in browser**

Load index.html. Start a level. HUD should show "L1/10". Complete 4 levels — on level 5 (index 4, challenge), count the portals: should be 6. Complete 10 levels — world map should appear and show `10/10`.

- [ ] **Step 6: Commit**

```bash
git add js/scenes/level.js js/scenes/result.js js/scenes/worldmap.js
git commit -m "feat: raise level count to 10, dynamic portal count for challenge levels"
```

---

## Task 4: Moving and disappearing platforms

**Files:**
- Modify: `js/scenes/level.js` — `_buildPlatforms()`, `update()`, `draw()`

**Interfaces:**
- Platform object shape extended: `{ x, y, w, h, type?: 'moving'|'disappearing', moveDir?: 1|-1, moveSpeed?: number, moveLeft?: number, moveRight?: number, disappearTimer?: number, disappearState?: 'solid'|'shaking'|'gone', disappearCooldown?: number }`

- [ ] **Step 1: Update _buildPlatforms to tag some platforms**

Replace `_buildPlatforms()` in `level.js`:

```js
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
```

- [ ] **Step 2: Update platform physics in update()**

In `update(dt)`, before the player update line `this.player.update(...)`, add:

```js
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
```

In `Player.update()` — the collision loop currently iterates `platforms`. We need to skip 'gone' platforms. The player file doesn't know about platform types, so we filter in level.js before passing. In `update(dt)` of LevelScene, change the player update call:

```js
const activePlatforms = this.platforms.filter(p => p.type !== 'disappearing' || p.disappearState !== 'gone');
this.player.update(dt, this.game.keys, activePlatforms);
```

For disappearing platform trigger — after player update, check if player landed on a disappearing platform:

```js
// trigger disappearing platforms
for (const p of this.platforms) {
  if (p.type === 'disappearing' && p.disappearState === 'solid') {
    const onIt = this.player.onGround &&
      this.player.x + this.player.w > p.x && this.player.x < p.x + p.w &&
      Math.abs((this.player.y + this.player.h) - p.y) < 4;
    if (onIt) { p.disappearState = 'shaking'; p.disappearTimer = 1.5; }
  }
}
```

- [ ] **Step 3: Update draw() for platform visual states**

In `draw(ctx)`, replace the platforms loop:

```js
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
```

- [ ] **Step 4: Verify in browser**

Play to level 4 (index 3) — platforms should be static. Level 4 (index 3 is 0-based 4th, so level display "L4") — actually level index 3 appears at level display L4. At level index 3, no moving platforms. At level index ≥3 (L4+), platform index 2 moves. At level index ≥5 (L6+), platform index 3 disappears 1.5s after landing. Confirm visuals: shaking animation then platform gone, returns after 2.5s.

- [ ] **Step 5: Commit**

```bash
git add js/scenes/level.js
git commit -m "feat: moving and disappearing platforms with difficulty gating"
```

---

## Task 5: Power-ups system

**Files:**
- Create: `js/powerups.js`
- Modify: `index.html` (add script tag before game.js)
- Modify: `js/player.js` (add power-up fields and apply them)
- Modify: `js/scenes/level.js` (spawn power-ups, update/draw, collision)

**Interfaces:**
- Produces: `class PowerUp` with `{ x, y, type, collected }`, `update(dt)`, `draw(ctx)`, `checkCollect(player) → boolean`
- Player power-up fields: `speedBoost`, `speedBoostTimer`, `extraJumpsLeft`, `shieldActive`, `starMultiplier`, `starMultiplierTimer`

- [ ] **Step 1: Create js/powerups.js**

```js
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
```

- [ ] **Step 2: Add script tag to index.html**

Add before `js/save.js` (or before `js/game.js`):
```html
<script src="js/powerups.js"></script>
```

- [ ] **Step 3: Add power-up state fields to Player**

In `js/player.js`, in the constructor, add after existing fields:

```js
// power-up state
this.speedBoost = false;
this.speedBoostTimer = 0;
this.extraJumpsLeft = 0;
this.shieldActive = false;
this.starMultiplier = 1;
this.starMultiplierTimer = 0;
```

In `Player.update()`, after `if (!this.alive) return;`, add timer countdowns:

```js
if (this.speedBoost) {
  this.speedBoostTimer -= dt;
  if (this.speedBoostTimer <= 0) { this.speedBoost = false; }
}
if (this.starMultiplierTimer > 0) {
  this.starMultiplierTimer -= dt;
  if (this.starMultiplierTimer <= 0) { this.starMultiplier = 1; }
}
```

Change the `const speed = 180;` line to:
```js
const speed = this.speedBoost ? 360 : 180;
```

For double-jump — after `if (jumpPressed && this.onGround) { ... }`, add:
```js
if (jumpPressed && !this.onGround && !this._jumpPressedLast && this.extraJumpsLeft > 0) {
  this.vy = -420;
  this.extraJumpsLeft--;
  Audio.jump();
}
this._jumpPressedLast = jumpPressed;
```

In `takeDamage()`, add shield check at top:
```js
takeDamage() {
  if (this.invincible) return false;
  if (this.shieldActive) { this.shieldActive = false; return false; }
  this.invincible = true;
  this.invincibleTimer = 1.5;
  this.vy = -250;
  return true;
}
```

- [ ] **Step 4: Spawn and update power-ups in LevelScene**

In `js/scenes/level.js`, add to constructor after `this.particles = []`:

```js
this.powerups = this._buildPowerups();
```

Add `_buildPowerups()` method:

```js
_buildPowerups() {
  const types = ['speed', 'doublejump', 'shield', 'multiplier'];
  const seed = this.game.state.currentWorld * 1000 + this.game.state.currentLevel + 42;
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  // pick 1–2 platforms (not ground) to spawn a power-up on
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
```

In `update(dt)`, after particles update block, add:

```js
// power-ups
for (const pu of this.powerups) {
  pu.update(dt);
  if (pu.checkCollect(this.player)) {
    this._applyPowerup(pu.type);
  }
}
```

Add `_applyPowerup(type)` method:

```js
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
```

In `draw(ctx)`, after drawing enemies and before drawing player, add:

```js
for (const pu of this.powerups) pu.draw(ctx);
```

For the star multiplier — in the stomp handler where `this.game.state.stars++`, change to:
```js
this.game.state.stars += this.player.starMultiplier;
```

- [ ] **Step 5: Draw power-up HUD indicators**

In `_drawHUD(ctx, W)`, after the stars line, add active power-up icons:

```js
// active power-up indicators
let puX = 10;
ctx.font = '16px serif';
ctx.textAlign = 'left';
if (this.player.speedBoost) { ctx.fillText(`🥾 ${this.player.speedBoostTimer.toFixed(1)}s`, puX, 52); puX += 80; }
if (this.player.extraJumpsLeft > 0) { ctx.fillText('🍄', puX, 52); puX += 30; }
if (this.player.shieldActive) { ctx.fillText('🛡️', puX, 52); puX += 30; }
if (this.player.starMultiplierTimer > 0) { ctx.fillText(`⭐×2 ${this.player.starMultiplierTimer.toFixed(1)}s`, puX, 52); }
```

- [ ] **Step 6: Verify in browser**

Load index.html. On first level, pick up 🥾 — player should move noticeably faster for 8 seconds. HUD should show "🥾 7.8s". Shield: take an enemy hit — no life lost, shield icon disappears. Double-jump mushroom: in the air, press jump again to get extra jump.

- [ ] **Step 7: Commit**

```bash
git add js/powerups.js index.html js/player.js js/scenes/level.js
git commit -m "feat: power-ups — speed boots, double-jump, shield, star multiplier"
```

---

## Task 6: Countdown timer for challenge levels

**Files:**
- Modify: `js/scenes/level.js`
- Modify: `js/game.js` (track levelStartTime)

**Interfaces:**
- `game.state.levelStartTime` — set to `Date.now()` when LevelScene is constructed
- Challenge level = `game.state.currentLevel % 5 === 4`

- [ ] **Step 1: Set levelStartTime in LevelScene constructor**

In `js/scenes/level.js`, in the constructor, add:

```js
this.isChallenge = this.game.state.currentLevel % 5 === 4;
this.timeLimit = 60; // seconds for challenge levels
this.timeLeft = this.timeLimit;
this.timeFailed = false;
```

- [ ] **Step 2: Count down timer in update()**

In `update(dt)`, at the top (after flash timer update), add:

```js
if (this.isChallenge && !this.timeFailed) {
  this.timeLeft -= dt;
  if (this.timeLeft <= 0) {
    this.timeLeft = 0;
    this.timeFailed = true;
    this._loseLife();
  }
}
```

- [ ] **Step 3: Draw timer in HUD**

In `_drawHUD(ctx, W)`, add after the world/level indicator:

```js
if (this.isChallenge) {
  const tColor = this.timeLeft < 10 ? '#ff4444' : '#FFD700';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = tColor;
  if (this.timeLeft < 10 && Math.floor(this.timeLeft * 4) % 2 === 0) {
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
  }
  ctx.fillText(`⏱ ${Math.ceil(this.timeLeft)}s`, W / 2, 52);
  ctx.shadowBlur = 0;
}
```

Also in `_drawHUD`, change the world/level indicator `ctx.textAlign` so it doesn't conflict — ensure `ctx.textAlign = 'right'` is set before the world name text, and reset to `'left'` at end.

- [ ] **Step 4: Verify**

Play to level 5 (index 4, L5 display) — timer should appear in HUD, count from 60. Let it expire — life lost, reset. On normal levels (index 0–3), no timer visible.

- [ ] **Step 5: Commit**

```bash
git add js/scenes/level.js js/game.js
git commit -m "feat: 60-second countdown timer on every 5th (challenge) level"
```

---

## Task 7: Star rating system

**Files:**
- Modify: `js/scenes/level.js` (track livesLostThisLevel, timeTarget)
- Modify: `js/scenes/result.js` (compute rating, show stars, save)
- Modify: `js/game.js` (pass livesLostThisLevel into result, save after result)

**Interfaces:**
- `game.state.livesLostThisLevel` — incremented in `_loseLife()` before checking for game-over
- `game.state.levelStartTime` — set when LevelScene is created
- Star rating: 1 star = completed; 2 stars = completed with 0 lives lost; 3 stars = completed + 0 lives lost + time ≤ timeTarget
- Time target: 45s for normal levels, 50s for challenge levels
- `game.state.levelStars["w_l"]` → best star rating for that level

- [ ] **Step 1: Track livesLostThisLevel and levelStartTime in LevelScene**

In `js/scenes/level.js`, constructor, add:

```js
this.game.state.livesLostThisLevel = 0;
this.game.state.levelStartTime = Date.now();
```

In `_loseLife()`, before `this.game.state.lives--`, add:

```js
this.game.state.livesLostThisLevel++;
```

- [ ] **Step 2: Compute and display star rating in ResultScene**

In `js/scenes/result.js`, in the constructor, add:

```js
this.starsEarned = 0;
this.starsBest = 0;
if (win) {
  const w = game.state.currentWorld;
  const l = game.state.currentLevel - 1; // currentLevel was already incremented in _levelComplete
  const elapsed = (Date.now() - game.state.levelStartTime) / 1000;
  const timeTarget = (l % 5 === 4) ? 50 : 45;
  const livesLost = game.state.livesLostThisLevel;
  this.starsEarned = 1;
  if (livesLost === 0) this.starsEarned = 2;
  if (livesLost === 0 && elapsed <= timeTarget) this.starsEarned = 3;

  const key = `${w}_${l}`;
  this.starsBest = (game.state.levelStars[key] || 0);
  const newBest = Math.max(this.starsBest, this.starsEarned);
  game.state.levelStars[key] = newBest;
  window.Save && window.Save.save(game.state);
}
```

- [ ] **Step 3: Draw star rating on result screen**

In `ResultScene.draw(ctx)`, inside the `if (this.win)` block, after the `ctx.fillText` for the next level text (around line `ctx.fillText(...cardY + 145)`), add:

```js
// star rating display
const starY = cardY + 220;
ctx.font = '32px serif';
ctx.textAlign = 'center';
for (let i = 0; i < 3; i++) {
  ctx.globalAlpha = i < this.starsEarned ? 1 : 0.2;
  ctx.fillText('⭐', W/2 - 40 + i * 40, starY);
}
ctx.globalAlpha = 1;
if (this.starsEarned > this.starsBest) {
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('New Best!', W/2, starY + 24);
} else {
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Best: ${'⭐'.repeat(this.starsBest) || '—'}`, W/2, starY + 24);
}
```

Also move `ctx.fillText('⭐ Stars collected...')` down so it doesn't overlap — change its y from `cardY + 185` to `cardY + 255` (or remove it since we now show per-level stars).

- [ ] **Step 4: Verify**

Complete a level without losing a life under 45 seconds → 3 stars shown. Complete again slowly → should show 3 stars still (personal best). Lose a life → 1 star.

- [ ] **Step 5: Commit**

```bash
git add js/scenes/level.js js/scenes/result.js js/game.js
git commit -m "feat: 1-3 star rating per level, saved to localStorage as personal best"
```

---

## Task 8: World map — per-level star icons

**Files:**
- Modify: `js/scenes/worldmap.js`

**Interfaces:**
- Consumes: `game.state.levelStars["w_l"]` → 0|1|2|3, `window.Save.load()` to sync at map open
- Consumes: `game.state.worldProgress[i]` — number of levels completed in world i (max 10)

- [ ] **Step 1: Sync save data when WorldMapScene opens**

In `WorldMapScene` constructor:

```js
constructor(game) {
  this.game = game;
  this.selected = 0;
  this.starAnim = 0;
  // sync saved stars into state
  if (window.Save) {
    const saved = window.Save.load();
    game.state.levelStars = saved.levelStars;
    // don't overwrite worldProgress — level.js already updated it
  }
}
```

- [ ] **Step 2: Add per-level star dots below each world node**

In `WorldMapScene.draw(ctx)`, inside the `WORLDS.forEach` loop, after `ctx.fillText(`${prog}/10 ⭐`, ...)`, add:

```js
// mini star row — 10 dots for the 10 levels
const dotY = nodeY + 90;
const dotSpacing = 10;
const dotStartX = nx - (5 * dotSpacing);
for (let lvl = 0; lvl < 10; lvl++) {
  const stars = (this.game.state.levelStars || {})[`${i}_${lvl}`] || 0;
  ctx.font = '9px serif';
  ctx.textAlign = 'center';
  ctx.globalAlpha = stars > 0 ? 1 : 0.25;
  ctx.fillText(stars >= 1 ? '⭐' : '·', dotStartX + lvl * dotSpacing, dotY);
}
ctx.globalAlpha = 1;
```

- [ ] **Step 3: Verify**

Complete a level with 3 stars. Go to world map. The first dot under world 1 should show ⭐. Incomplete levels show faint dots.

- [ ] **Step 4: Commit**

```bash
git add js/scenes/worldmap.js
git commit -m "feat: world map shows per-level star icons"
```

---

## Task 9: Visual hints — emoji icons for small-number equations

**Files:**
- Modify: `js/scenes/level.js` (`_drawHUD`)

**Interfaces:**
- Only renders hints when both operands (a, b) in the equation are ≤ 10 for addition/subtraction
- Extract a/b from `this.eq.display` — but this is fragile. Instead, store them on the equation object.

- [ ] **Step 1: Store operands in generateEquation return value**

In `js/equations.js`, in `window.generateEquation`, change the final return to include `a` and `b`:

```js
return { display, answer, distractors: generateDistractors(answer, rand, distractorCount), portalCount, a, b };
```

Make sure `a` and `b` are defined for all branches. For `mixed` op, they are already defined. For missing-number/operator variants, `a` and `b` are already in scope.

- [ ] **Step 2: Draw emoji hint in HUD**

In `LevelScene._drawHUD(ctx, W)`, after the equation bubble is drawn (after `ctx.fillText(eq, W/2, 33)`), add:

```js
// emoji visual hint for small operand equations (addition with a,b ≤ 10)
const { a, b } = this.eq;
const op = this.world.operation;
if ((op === 'addition' || op === 'subtraction') && a != null && b != null && a <= 10 && b <= 10) {
  const FRUIT = ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍈','🍐','🍌'];
  const fruit = FRUIT[this.game.state.currentWorld % FRUIT.length];
  const hintA = fruit.repeat(Math.min(a, 10));
  const hintB = fruit.repeat(Math.min(b, 10));
  const hintOp = op === 'addition' ? '+' : '−';
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`${hintA} ${hintOp} ${hintB}`, W / 2, 68);
}
```

This renders below the HUD bar. To ensure it's visible, the HUD bar height needs to be extended — in the HUD background rect, change the height from 54 to 74 when hints apply:

```js
// In _drawHUD, replace the top bar background:
const { a: ha, b: hb } = this.eq;
const showHint = (this.world.operation === 'addition' || this.world.operation === 'subtraction')
  && ha != null && hb != null && ha <= 10 && hb <= 10;
const hudH = showHint ? 74 : 54;
ctx.fillStyle = 'rgba(0,0,0,0.55)';
ctx.beginPath();
ctx.roundRect(0, 0, W, hudH, [0, 0, 12, 12]);
ctx.fill();
```

- [ ] **Step 3: Verify**

On world 1 (Candy/addition), early levels with a,b ≤ 10 should show a row of 🍎 emojis below the equation in the HUD. On level 9 with large numbers (a,b > 10), no hint row.

- [ ] **Step 4: Commit**

```bash
git add js/equations.js js/scenes/level.js
git commit -m "feat: emoji visual hints for small-number addition/subtraction equations"
```

---

## Task 10: Extract HUD into js/scenes/hud.js

**Files:**
- Create: `js/scenes/hud.js`
- Modify: `js/scenes/level.js` (replace `_drawHUD` call with HUD instance)
- Modify: `index.html` (add script tag)

**Interfaces:**
- Produces: `class HUD` with `draw(ctx, game, world, eq, player, isChallenge, timeLeft)` → void

- [ ] **Step 1: Create js/scenes/hud.js**

Extract the full `_drawHUD` logic (including power-up indicators and timer) into a standalone class:

```js
class HUD {
  draw(ctx, game, world, eq, player, isChallenge, timeLeft) {
    const W = game.WIDTH;
    const { a: ha, b: hb } = eq;
    const showHint = (world.operation === 'addition' || world.operation === 'subtraction')
      && ha != null && hb != null && ha <= 10 && hb <= 10;
    const hudH = (showHint || isChallenge) ? 74 : 54;

    // top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, hudH, [0, 0, 12, 12]);
    ctx.fill();

    // equation bubble
    const eqText = eq.display;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(eqText).width + 40;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(W/2 - textW/2, 7, textW, 38, 10);
    ctx.fill();
    ctx.fillStyle = '#1a0033';
    ctx.fillText(eqText, W/2, 33);

    // emoji hint
    if (showHint) {
      const FRUIT = ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍈','🍐','🍌'];
      const fruit = FRUIT[game.state.currentWorld % FRUIT.length];
      const hintA = fruit.repeat(Math.min(ha, 10));
      const hintB = fruit.repeat(Math.min(hb, 10));
      const hintOp = world.operation === 'addition' ? '+' : '−';
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`${hintA} ${hintOp} ${hintB}`, W / 2, 68);
    }

    // challenge timer
    if (isChallenge) {
      const tColor = timeLeft < 10 ? '#ff4444' : '#FFD700';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = tColor;
      if (timeLeft < 10 && Math.floor(timeLeft * 4) % 2 === 0) {
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
      }
      ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, W / 2, 68);
      ctx.shadowBlur = 0;
    }

    // hearts
    ctx.textAlign = 'left';
    ctx.font = '22px serif';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < game.state.lives ? 1 : 0.2;
      ctx.fillText('❤️', 10 + i * 28, 36);
    }
    ctx.globalAlpha = 1;

    // stars
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`⭐ ${game.state.stars}`, W - 10, 35);

    // world/level
    ctx.font = '12px sans-serif';
    ctx.fillStyle = world.accentColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${world.emoji} ${world.name}  L${game.state.currentLevel + 1}/10`, W - 10, 52);

    // active power-up indicators
    let puX = 10;
    ctx.font = '16px serif';
    ctx.textAlign = 'left';
    if (player.speedBoost) {
      ctx.fillStyle = '#fff';
      ctx.fillText(`🥾 ${player.speedBoostTimer.toFixed(1)}s`, puX, 52);
      puX += 85;
    }
    if (player.extraJumpsLeft > 0) { ctx.fillText('🍄', puX, 52); puX += 30; }
    if (player.shieldActive) { ctx.fillText('🛡️', puX, 52); puX += 30; }
    if (player.starMultiplierTimer > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`⭐×2 ${player.starMultiplierTimer.toFixed(1)}s`, puX, 52);
    }

    ctx.textAlign = 'left';
  }
}
```

- [ ] **Step 2: Add script tag to index.html**

Add before `js/scenes/level.js`:
```html
<script src="js/scenes/hud.js"></script>
```

- [ ] **Step 3: Replace _drawHUD in LevelScene**

In `LevelScene` constructor, add:
```js
this.hud = new HUD();
```

In `draw(ctx)`, replace the line `this._drawHUD(ctx, W);` with:
```js
this.hud.draw(ctx, this.game, this.world, this.eq, this.player, this.isChallenge, this.timeLeft);
```

Delete the old `_drawHUD(ctx, W)` method entirely from `level.js`.

- [ ] **Step 4: Verify**

Load and play normally — HUD should look and function identically to before. Open DevTools, confirm no errors.

- [ ] **Step 5: Commit**

```bash
git add js/scenes/hud.js index.html js/scenes/level.js
git commit -m "refactor: extract HUD rendering into js/scenes/hud.js"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|---|---|
| 10 levels per world (50 total) | Task 3 |
| Difficulty scales within each world | Task 2 |
| Every 5th level = challenge (6 portals + timer) | Tasks 2, 3, 6 |
| Missing-number equation type | Task 2 |
| Missing-operator equation type | Task 2 |
| Speed boots power-up (2×, 8s) | Task 5 |
| Double-jump mushroom power-up | Task 5 |
| Shield power-up (absorb one hit) | Task 5 |
| Star multiplier power-up (×2, 10s) | Task 5 |
| Moving platforms | Task 4 |
| Disappearing platforms (1.5s after land) | Task 4 |
| Countdown timer on challenge levels | Task 6 |
| Visual emoji hints for numbers ≤ 10 | Task 9 |
| 1–3 star rating per level | Task 7 |
| localStorage persistence (progress + stars) | Task 1 |
| Result screen shows earned vs personal best stars | Task 7 |
| World map shows star totals + per-level icons | Task 8 |
| Extract HUD to hud.js | Task 10 |
| new js/save.js | Task 1 |
| new js/powerups.js | Task 5 |
| new js/scenes/hud.js | Task 10 |
