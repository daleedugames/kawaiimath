# Kawaii Math Platformer — Design Spec
**Date:** 2026-06-21  
**Status:** Approved

---

## Overview

A Mario-style browser platformer for primary school children (ages 8–11) that teaches arithmetic through gameplay. A math equation is displayed at the top of the screen; the player navigates platforms to reach and jump through the numbered torii-gate portal that matches the correct answer. Wrong portals bounce the player back and cost a life.

---

## Target Audience

- Ages 8–11 (primary school)
- Curriculum: addition, subtraction, multiplication, division, mixed operations
- Platform: browser (HTML5 Canvas, no install, no dependencies)

---

## Architecture

### Single-file delivery
- One `index.html` with embedded JS and CSS
- No build step, no external libraries, no image files
- Audio generated via Web Audio API
- Visuals drawn entirely on Canvas (shapes + emoji accents)

### Scene system
Three scenes managed by a central `Game` controller:

| Scene | Purpose |
|-------|---------|
| `WorldMapScene` | Overworld — player selects a themed world |
| `LevelScene` | Active platformer level |
| `ResultScene` | Win/fail screen between levels |

Scenes implement `{ update(dt), draw(ctx), onInput(key) }` and are swapped by the game controller.

### State
```
{
  currentWorld: 0–4,
  currentLevel: 0–4,
  lives: 3,
  stars: 0,
  worldProgress: [0,0,0,0,0]   // levels unlocked per world
}
```

---

## World Map

- Top-down tile map style, drawn on canvas
- Five world nodes arranged on a winding path
- Worlds unlock sequentially; levels within a world unlock on completion
- Player avatar walks the path between selections

---

## Level Design

### Layout (single screen, no scroll)
- **Top bar** — equation in a rounded speech-bubble box, hearts (lives), star counter
- **Play area** — 5–7 floating platforms at varied heights
- **Bottom row** — 4 numbered torii-gate portals

### Portals
- One correct answer, three plausible distractors
- Distractor strategy: common calculation errors, off-by-one, reversed digits
- Portal positions shuffled each level load
- Wrong portal: red flash + bounce-back + lose 1 life
- Correct portal: sparkle burst + chime + scene transition

### Player — Kawaii Tanuki
- Drawn with canvas primitives + emoji accents (no sprites)
- Controls: Arrow keys / WASD (move), Space / Up (jump)
- Physics: constant gravity, variable-height jump (hold for higher)
- Animations: idle bob, 2-frame walk, jump arc, celebrate spin, hurt flash

### Enemies — Chibi Onigiri / Mochi
- Patrol platforms back and forth
- Stomp = +1 star bonus
- Touch from side = -1 life + brief invincibility frames

---

## Worlds & Curriculum

| # | World | Theme | Operation | Equation example |
|---|-------|-------|-----------|-----------------|
| 1 | 🍡 Candy Kingdom | Pastels, sweets, clouds | Addition (up to 100) | `47 + 36 = ?` |
| 2 | 🌊 Ocean Cove | Underwater, coral, bubbles | Subtraction (up to 100) | `83 − 47 = ?` |
| 3 | ⭐ Star Shrine | Night sky, paper lanterns | Multiplication (×1–12) | `6 × 8 = ?` |
| 4 | 🍄 Mushroom Forest | Earthy, mystical, toadstools | Division (no remainders) | `56 ÷ 7 = ?` |
| 5 | 🏯 Dragon Castle | Sakura, Japanese castle | Mixed operations | `(4 × 3) + 9 = ?` |

Each world has 5 levels = 25 levels total.  
Equations are generated procedurally within each world's constraints, seeded per level for reproducibility.

---

## Visual Style

- **Aesthetic:** Kawaii Japanese — soft colours, round shapes, big eyes on characters
- **No external assets** — everything drawn with Canvas 2D API shapes and emoji
- **Per-world palettes:**
  - Candy: `#FFB7C5`, `#FFF0F5`, `#A8E6CF`
  - Ocean: `#006994`, `#00CED1`, `#E0FFFF`
  - Star: `#1a0033`, `#FFD700`, `#C084FC`
  - Forest: `#2D5016`, `#8B4513`, `#90EE90`
  - Castle: `#8B0000`, `#FFB6C1`, `#696969`
- **UI elements:** wooden sign texture fills, paper lantern life icons, gold star score
- **Portals:** torii gate silhouettes with animated shimmer glow

---

## Audio

All audio generated via Web Audio API oscillators — zero audio files.

| Sound | Trigger |
|-------|---------|
| Jump bloop | Player jumps |
| Stomp pop | Enemy stomped |
| Wrong buzz | Wrong portal entered |
| Correct fanfare | Correct portal entered |
| Life lost jingle | Life lost |
| Background melody | Looping per world (different tone/scale) |

---

## HUD

- Top-left: 3 ❤️ heart icons (one dims per life lost)
- Top-right: ⭐ + star count
- Top-centre: Equation in a large rounded speech-bubble (`6 × 8 = ?`)

---

## Fail / Win States

- **Wrong portal:** bounce back, -1 life, red screen flash
- **0 lives:** "Oh no!" screen, retry level button
- **Level complete:** star burst animation, proceed to next level
- **World complete:** unlock next world, return to world map
- **All 25 levels complete:** "You're a Math Master!" celebration screen

---

## Out of Scope (v1)

- Save/load progress (session only)
- Multiplayer
- Leaderboard
- Sound toggle UI (always on)
- Mobile / touch controls
