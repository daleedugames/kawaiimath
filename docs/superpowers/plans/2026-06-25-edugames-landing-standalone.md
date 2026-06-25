# edu.games Landing Page — Standalone Conversion + Email Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `Edugames/Landing/edu.games Landing.dc.html` from a Design Component (requires `support.js`) into a self-contained `index.html` with vanilla JS, and wire the email form to Airtable + Resend via a Vercel serverless function.

**Architecture:** A static `index.html` manages a three-phase form (email → role selection → confirmation) using a plain JS state object + a `render()` function that shows/hides DOM sections. On submission, it POSTs to `/api/subscribe`, a Vercel serverless function that writes the signup to Airtable and sends a confirmation email via Resend using native `fetch` (no npm packages).

**Tech Stack:** Vanilla JS (ES2020), HTML/CSS, Vercel serverless functions (Node 18), Airtable REST API, Resend API.

## Global Constraints

- No npm packages in `api/subscribe.js` — use Node.js native `fetch` (available Node 18+)
- No JS framework in `index.html` — vanilla JS only, no build step
- All existing inline styles and HTML structure must be preserved exactly
- `support.js` must NOT be referenced in `index.html`
- Environment variables: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Airtable table fields: `Email` (email), `Roles` (single line text, comma-separated), `SignedUpAt` (ISO 8601 string)

---

### Task 1: Vercel serverless function `api/subscribe.js`

**Files:**
- Create: `api/subscribe.js`

**Interfaces:**
- Consumes: `POST /api/subscribe` with JSON body `{ email: string, roles: string[] }`
- Produces: `200 { ok: true }` on success, `400 { error: string }` on bad input, `500 { error: string }` on upstream failure

- [ ] **Step 1: Create the file with a stub that returns 405 for non-POST**

Create `api/subscribe.js`:

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Verify the stub works locally with Vercel CLI**

Run: `npx vercel dev` (from repo root, port 3000 by default)

In a second terminal:
```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","roles":["dev"]}' | cat
```
Expected output: `{"ok":true}`

```bash
curl -s -X GET http://localhost:3000/api/subscribe | cat
```
Expected output: `{"error":"Method not allowed"}`

- [ ] **Step 3: Add email validation**

Replace the stub body:

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, roles } = req.body ?? {};
  const trimmed = (email ?? '').trim();

  if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 4: Verify validation**

```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","roles":[]}' | cat
```
Expected: `{"error":"Invalid email address."}`

```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"good@example.com","roles":["dev"]}' | cat
```
Expected: `{"ok":true}`

- [ ] **Step 5: Add Airtable write**

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, roles } = req.body ?? {};
  const trimmed = (email ?? '').trim();

  if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const rolesStr = Array.isArray(roles) ? roles.join(', ') : '';

  const atRes = await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Email: trimmed,
          Roles: rolesStr,
          SignedUpAt: new Date().toISOString(),
        },
      }),
    }
  );

  if (!atRes.ok) {
    const text = await atRes.text();
    console.error('Airtable error:', text);
    return res.status(500).json({ error: 'Failed to save signup. Please try again.' });
  }

  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 6: Test Airtable write with real env vars**

Add env vars to `.env.local` in the repo root (Vercel CLI reads this):
```
AIRTABLE_API_KEY=your_token
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Signups
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=hello@edu.games
```

Restart `npx vercel dev`, then:
```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"dale@edu.games","roles":["dev","edu"]}' | cat
```
Expected: `{"ok":true}`

Verify the record appears in Airtable with `Email`, `Roles: "dev, edu"`, and `SignedUpAt` populated.

- [ ] **Step 7: Add Resend confirmation email**

Replace the final `return res.status(200)...` line with:

```js
  const rsRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: trimmed,
      subject: "You're on the edu.games early access list",
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:40px 32px;background:#111c33;border-radius:16px;border:1px solid rgba(59,130,246,.3);">
    <img src="https://edu.games/assets/edugames_logo.svg" alt="edu.games" style="height:36px;margin-bottom:28px;display:block;">
    <h1 style="font-family:'Space Grotesk',sans-serif;color:#F8FAFC;font-size:26px;margin:0 0 12px;">You're on the list.</h1>
    <p style="color:#CBD5E1;font-size:16px;line-height:1.6;margin:0 0 24px;">Thanks for signing up for early access to <strong style="color:#F8FAFC;">edu.games</strong> — the learning games platform. We'll email you at <strong style="color:#F8FAFC;">${trimmed}</strong> when early access opens.</p>
    <p style="color:#64748B;font-size:13px;margin:0;">&copy; 2026 edu.games</p>
  </div>
</body>
</html>`,
    }),
  });

  if (!rsRes.ok) {
    const text = await rsRes.text();
    console.error('Resend error:', text);
    return res.status(500).json({ error: 'Failed to send confirmation email. Please try again.' });
  }

  return res.status(200).json({ ok: true });
```

- [ ] **Step 8: Test full flow**

```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"dale@edu.games","roles":["edu"]}' | cat
```
Expected: `{"ok":true}`

Check inbox for confirmation email. Check Airtable for the new record.

- [ ] **Step 9: Commit**

```bash
git add api/subscribe.js
git commit -m "feat: add /api/subscribe serverless function (Airtable + Resend)"
```

---

### Task 2: Standalone `Edugames/Landing/index.html`

**Files:**
- Create: `Edugames/Landing/index.html`

**Interfaces:**
- Consumes: `POST /api/subscribe` → `{ ok: true }` or `{ error: string }` (produced by Task 1)
- Produces: a self-contained HTML page with no `support.js` dependency

- [ ] **Step 1: Create `index.html` with the full static HTML structure**

Create `Edugames/Landing/index.html` with the following content. This preserves all existing markup and styles exactly, replacing the DC template engine with plain HTML (interactive sections start hidden and are shown by the JS in Step 2):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>edu.games — The Learning Games Platform</title>
  <style>
    *{box-sizing:border-box;}
    html,body{margin:0;padding:0;background:#0F172A;height:100%;}
    body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
    input::placeholder{color:rgba(226,232,240,.55);}
    @keyframes heroRise{from{transform:translateY(18px);}to{transform:translateY(0);}}
    @keyframes wallDrift{from{transform:scale(1.12) translateY(0);}to{transform:scale(1.12) translateY(-26px);}}
    .role-btn{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:15px 18px;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:600;color:#F8FAFC;background:rgba(15,23,42,.5);border:1.5px solid rgba(148,163,184,.35);backdrop-filter:blur(4px);transition:all .15s ease;}
    .role-btn.on-dev{background:rgba(255,255,255,.07);border-color:#06B6D4;}
    .role-btn.on-edu{background:rgba(255,255,255,.07);border-color:#3B82F6;}
    .role-btn.on-stu{background:rgba(255,255,255,.07);border-color:#A3E635;}
    .role-box{flex:0 0 auto;width:24px;height:24px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#0F172A;background:transparent;border:2px solid rgba(148,163,184,.6);}
    .role-btn.on-dev .role-box{background:#06B6D4;border-color:#06B6D4;}
    .role-btn.on-edu .role-box{background:#3B82F6;border-color:#3B82F6;}
    .role-btn.on-stu .role-box{background:#A3E635;border-color:#A3E635;}
    .card{position:relative;background:#111c33;border-radius:18px;padding:34px 30px 32px;overflow:hidden;transition:transform .25s ease,border-color .25s ease;}
    .card:hover{transform:translateY(-6px);}
  </style>
</head>
<body>
<div style="background:#0F172A;color:#E2E8F0;min-height:100vh;">

  <!-- HERO -->
  <section style="position:relative;overflow:hidden;background:#0F172A;min-height:clamp(660px,94vh,940px);display:flex;flex-direction:column;">

    <!-- game-cover wall -->
    <div id="game-wall" style="position:absolute;inset:0;z-index:0;overflow:hidden;">
      <div style="position:absolute;top:50%;left:50%;width:150%;transform:translate(-50%,-50%) rotate(-8deg) scale(1.08);transform-origin:center center;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;opacity:.95;" id="wall-grid"></div>
    </div>

    <!-- overlays -->
    <div style="position:absolute;inset:0;z-index:1;background:radial-gradient(85% 65% at 50% 62%, rgba(15,23,42,.86) 0%, rgba(15,23,42,.55) 45%, rgba(15,23,42,.12) 100%);"></div>
    <div style="position:absolute;inset:0;z-index:1;background:linear-gradient(180deg, rgba(15,23,42,.62) 0%, rgba(15,23,42,.18) 22%, rgba(15,23,42,.18) 55%, rgba(15,23,42,.92) 100%);"></div>

    <!-- top bar -->
    <header style="position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:26px clamp(20px,5vw,64px);">
      <img src="assets/edugames_logo.svg" alt="edu.games" style="height:53px;width:auto;display:block;filter:drop-shadow(0 2px 8px rgba(0,0,0,.45));">
      <a href="#" style="display:inline-flex;align-items:center;height:42px;padding:0 22px;background:#3B82F6;color:#fff;font-weight:600;font-size:15px;border-radius:6px;text-decoration:none;box-shadow:0 4px 14px rgba(59,130,246,.35);">Sign In</a>
    </header>

    <!-- hero content -->
    <div style="position:relative;z-index:3;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px clamp(20px,5vw,40px) clamp(60px,10vh,110px);">
      <div style="max-width:780px;animation:heroRise .7s cubic-bezier(.22,1,.36,1);">
        <h1 style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(42px,6.8vw,82px);line-height:1.02;letter-spacing:-.025em;margin:0 0 22px;color:#F8FAFC;text-shadow:0 2px 30px rgba(0,0,0,.5);">The Learning Games Platform</h1>
        <p style="font-size:clamp(18px,2.4vw,28px);font-weight:500;line-height:1.35;margin:0 auto 32px;max-width:640px;color:#CBD5E1;">Discover, deliver, and analyse game&#8209;based learning.</p>

        <!-- Phase 1: email form -->
        <div id="phase-email" style="display:block;">
          <form id="email-form" style="display:flex;flex-wrap:wrap;gap:10px;max-width:620px;margin:0 auto;justify-content:center;">
            <div style="flex:1 1 280px;min-width:240px;position:relative;">
              <input id="email-input" type="email" placeholder="Email address" aria-label="Email address" style="width:100%;height:62px;padding:0 18px;font-size:17px;font-family:inherit;color:#F8FAFC;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.55);border-radius:8px;outline:none;backdrop-filter:blur(4px);" />
            </div>
            <button type="submit" style="flex:0 0 auto;height:62px;padding:0 30px;display:inline-flex;align-items:center;gap:10px;font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:600;color:#fff;background:#3B82F6;border:none;border-radius:8px;cursor:pointer;box-shadow:0 6px 22px rgba(59,130,246,.4);">Get early access<span style="font-size:24px;line-height:1;">›</span></button>
          </form>
          <p id="email-error" style="color:#FCA5A5;font-size:14px;margin:14px 0 0;font-weight:500;display:none;"></p>
        </div>

        <!-- Phase 2: role selection -->
        <div id="phase-roles" style="display:none;max-width:480px;margin:0 auto;">
          <p style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:600;color:#F8FAFC;margin:0 0 4px;">One quick thing</p>
          <p style="font-size:16px;color:#CBD5E1;margin:0 0 22px;">Which best describes you? Choose any that apply.</p>
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
            <button type="button" id="btn-dev" class="role-btn" data-role="dev"><span class="role-box"></span><span style="line-height:1.2;">I'm a Developer</span></button>
            <button type="button" id="btn-edu" class="role-btn" data-role="edu"><span class="role-box"></span><span style="line-height:1.2;">I'm an Educator</span></button>
            <button type="button" id="btn-stu" class="role-btn" data-role="stu"><span class="role-box"></span><span style="line-height:1.2;">I'm a Student</span></button>
          </div>
          <button type="button" id="btn-finish" style="width:100%;height:58px;font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600;color:#fff;background:#3B82F6;border:none;border-radius:8px;cursor:pointer;box-shadow:0 6px 22px rgba(59,130,246,.4);">Get early access</button>
          <p id="role-error" style="color:#FCA5A5;font-size:14px;margin:14px 0 0;font-weight:500;display:none;"></p>
        </div>

        <!-- Phase 3: confirmation -->
        <div id="phase-done" style="display:none;max-width:560px;margin:0 auto;padding:26px 28px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.45);border-radius:12px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;">
            <span style="width:30px;height:30px;border-radius:50%;background:#A3E635;display:inline-flex;align-items:center;justify-content:center;color:#0F172A;font-weight:700;font-size:18px;">✓</span>
            <span style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:600;color:#F8FAFC;">You're on the list</span>
          </div>
          <p style="margin:0;color:#CBD5E1;font-size:16px;">We'll email <strong id="done-email" style="color:#F8FAFC;"></strong> when early access opens.</p>
        </div>

      </div>
    </div>
  </section>

  <!-- THREE LAYERS -->
  <section id="layers" style="background:#0B1120;padding:clamp(64px,9vw,110px) clamp(20px,5vw,64px);border-top:1px solid rgba(148,163,184,.12);">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="text-align:center;max-width:640px;margin:0 auto clamp(44px,6vw,68px);">
        <div style="font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#06B6D4;margin-bottom:14px;">The Learning Games Platform</div>
        <h2 style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,52px);line-height:1.06;letter-spacing:-.02em;margin:0 0 16px;color:#F8FAFC;">Games are the future of learning.</h2>
        <p style="margin:0;font-size:clamp(16px,1.8vw,19px);color:#94A3B8;line-height:1.5;">Find games, assign them to students, and get deep learning insights &mdash; edu.games is purpose-built for learning games.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;">
        <article class="card" style="border:1px solid rgba(6,182,212,.28);">
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:#06B6D4;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#67E8F9;margin-bottom:6px;">Marketplace</div>
          <h3 style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;margin:0 0 12px;color:#06B6D4;">Discover</h3>
          <p style="margin:0;font-size:19px;line-height:1.45;color:#E2E8F0;font-weight:500;">Find games to make your courses more interesting.</p>
        </article>
        <article class="card" style="border:1px solid rgba(59,130,246,.28);">
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:#3B82F6;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#93C5FD;margin-bottom:6px;">Learning Management System</div>
          <h3 style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;margin:0 0 12px;color:#3B82F6;">Deliver</h3>
          <p style="margin:0;font-size:19px;line-height:1.45;color:#E2E8F0;font-weight:500;">Assign, track, and manage gameplay learning.</p>
        </article>
        <article class="card" style="border:1px solid rgba(163,230,53,.28);">
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:#A3E635;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#BEF264;margin-bottom:6px;">xAPI analytics</div>
          <h3 style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;margin:0 0 12px;color:#A3E635;">Analyse</h3>
          <p style="margin:0;font-size:19px;line-height:1.45;color:#E2E8F0;font-weight:500;">Get advanced data about student performance.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer style="background:#0B1120;padding:30px clamp(20px,5vw,64px);border-top:1px solid rgba(148,163,184,.12);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
    <img src="assets/edugames_logo.svg" alt="edu.games" style="height:26px;width:auto;display:block;opacity:.85;">
    <span style="font-size:13px;color:#64748B;">&copy; 2026 edu.games — The Learning Games Platform</span>
  </footer>

</div>

<script>
(function () {
  // ── Game wall ──────────────────────────────────────────────────────────────
  const appIds = [
    220200,255710,230290,427520,233720,375820,370360,504210,558990,346010,
    684410,1250410,1410710,244850,281990,236850,394360,400,620,22000,
    813780,289070,8930,294100,1366540,526870,1493710,535930,648350,1142710,
    275850,361420,
  ];
  const order = appIds
    .map((id, i) => ({ id, k: (i * 73 + 17) % appIds.length }))
    .sort((a, b) => a.k - b.k)
    .map(o => o.id);
  const grid = document.getElementById('wall-grid');
  for (let i = 0; i < 96; i++) {
    const id = order[i % order.length];
    const img = document.createElement('img');
    img.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:6px;display:block;background:#1e293b;';
    grid.appendChild(img);
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    email: '',
    roles: { dev: false, edu: false, stu: false },
    loading: false,
  };

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const phaseEmail  = document.getElementById('phase-email');
  const phaseRoles  = document.getElementById('phase-roles');
  const phaseDone   = document.getElementById('phase-done');
  const emailInput  = document.getElementById('email-input');
  const emailError  = document.getElementById('email-error');
  const roleError   = document.getElementById('role-error');
  const doneEmail   = document.getElementById('done-email');
  const btnFinish   = document.getElementById('btn-finish');

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function updateRoleButtons() {
    ['dev', 'edu', 'stu'].forEach(role => {
      const btn = document.getElementById('btn-' + role);
      const on = state.roles[role];
      btn.classList.toggle('on-' + role, on);
      btn.querySelector('.role-box').textContent = on ? '✓' : '';
    });
  }

  // ── Email form submit ──────────────────────────────────────────────────────
  document.getElementById('email-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const val = emailInput.value.trim();
    if (!val || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      showError(emailError, 'Please enter a valid email address.');
      return;
    }
    showError(emailError, '');
    state.email = val;
    phaseEmail.style.display = 'none';
    phaseRoles.style.display = 'block';
    updateRoleButtons();
  });

  // ── Role toggle ────────────────────────────────────────────────────────────
  ['dev', 'edu', 'stu'].forEach(role => {
    document.getElementById('btn-' + role).addEventListener('click', function () {
      state.roles[role] = !state.roles[role];
      updateRoleButtons();
    });
  });

  // ── Finish button ──────────────────────────────────────────────────────────
  btnFinish.addEventListener('click', async function () {
    if (state.loading) return;
    state.loading = true;
    btnFinish.textContent = 'Sending…';
    btnFinish.disabled = true;
    showError(roleError, '');

    const selectedRoles = Object.entries(state.roles)
      .filter(([, v]) => v)
      .map(([k]) => k);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email, roles: selectedRoles }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(roleError, data.error || 'Something went wrong — please try again.');
        btnFinish.textContent = 'Get early access';
        btnFinish.disabled = false;
        state.loading = false;
        return;
      }

      doneEmail.textContent = state.email;
      phaseRoles.style.display = 'none';
      phaseDone.style.display = 'block';
    } catch {
      showError(roleError, 'Something went wrong — please try again.');
      btnFinish.textContent = 'Get early access';
      btnFinish.disabled = false;
      state.loading = false;
    }
  });
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Open the file in a browser and verify the static render**

Open `Edugames/Landing/index.html` directly in a browser (file:// URL is fine for this check).

Verify:
- Game wall of Steam cover images renders behind the hero
- Logo loads from `assets/edugames_logo.svg`
- "The Learning Games Platform" headline is visible
- Email input and "Get early access" button are shown
- Layers section (Discover / Deliver / Analyse cards) renders below the hero
- Footer is visible

- [ ] **Step 3: Test the email validation phase**

In the browser:
1. Click "Get early access" with an empty field → red error message appears
2. Type `notanemail` → click submit → error message
3. Type `test@example.com` → click submit → role selection phase appears (email form hides)
4. Role buttons show unchecked state; clicking one toggles the checkmark on/off

- [ ] **Step 4: Test the full form flow end-to-end with the local Vercel dev server**

If `npx vercel dev` is running (from Task 1):

Open `http://localhost:3000/Edugames/Landing/index.html` (Vercel serves static files).

1. Enter a real email → submit → role phase appears
2. Toggle one or more roles
3. Click "Get early access" → button shows "Sending…" and is disabled
4. On success: confirmation box appears with the correct email address

Verify Airtable has the new record and the confirmation email arrived in inbox.

- [ ] **Step 5: Test error handling**

Temporarily break the Airtable API key in `.env.local` (change one character), restart `vercel dev`, and repeat the form flow. Verify:
- "Something went wrong — please try again." appears in red below the finish button
- The button re-enables so the user can retry
- The form does NOT advance to the confirmation screen

Restore the correct API key.

- [ ] **Step 6: Commit**

```bash
git add "Edugames/Landing/index.html"
git commit -m "feat: add standalone landing page index.html (vanilla JS, no support.js)"
```

---

### Task 3: Vercel environment variables + deploy

**Files:**
- No code changes — configuration only

**Interfaces:**
- Consumes: `api/subscribe.js` (Task 1), `Edugames/Landing/index.html` (Task 2)
- Produces: working production deployment at the project's Vercel URL

- [ ] **Step 1: Add environment variables to Vercel**

In the Vercel dashboard for this project (or via CLI):

```bash
npx vercel env add AIRTABLE_API_KEY production
npx vercel env add AIRTABLE_BASE_ID production
npx vercel env add AIRTABLE_TABLE_NAME production
npx vercel env add RESEND_API_KEY production
npx vercel env add RESEND_FROM_EMAIL production
```

Repeat for `preview` environment so preview deployments also work.

- [ ] **Step 2: Deploy to preview**

```bash
npx vercel
```

Visit the preview URL. Open `<preview-url>/Edugames/Landing/index.html`, complete the form with a real email, and verify:
- Record appears in Airtable
- Confirmation email arrives in inbox

- [ ] **Step 3: Deploy to production**

```bash
npx vercel --prod
```

Verify the production URL serves `index.html` and the full form flow works.

- [ ] **Step 4: Commit deployment notes**

```bash
git commit --allow-empty -m "chore: deploy landing page to production (Vercel)"
```
