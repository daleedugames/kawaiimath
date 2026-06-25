# edu.games Landing Page — Standalone Conversion + Email Integration

**Date:** 2026-06-25  
**Status:** Approved

## Overview

Convert `Edugames/Landing/edu.games Landing.dc.html` (a Design Component format that requires `support.js`) into a self-contained `index.html` using vanilla JS. Wire the email capture form to Airtable (record storage) and Resend (confirmation email) via a Vercel serverless function.

## Files

### `Edugames/Landing/index.html`
Standalone replacement for the `.dc.html` file. No framework, no build step, no `support.js` dependency.

**Preserves exactly:**
- All existing HTML structure and inline styles
- Hero section with game cover wall (Steam CDN images, 96 tiles)
- Three-state form flow: email input → role selection → confirmation
- Three-card "Layers" section (Discover / Deliver / Analyse)
- Footer

**New behaviour:**
- Vanilla JS state machine manages the three form phases
- On "Get early access" (email step): client-side email validation → show role phase
- On "Get early access" (role step): `POST /api/subscribe` with `{ email, roles }` → show confirmation on success, inline error on failure
- Loading state on the final button while the request is in flight
- `support.js` is no longer referenced

### `api/subscribe.js`
Vercel serverless function (Node.js runtime).

**Request:** `POST /api/subscribe`  
```json
{ "email": "user@example.com", "roles": ["dev", "edu"] }
```

**Steps:**
1. Validate `email` with regex — return `400` if invalid
2. Write record to Airtable via REST API: fields `Email`, `Roles` (comma-separated string), `SignedUpAt` (ISO timestamp)
3. Send confirmation email via Resend — plain branded email ("You're on the list"), designed pass deferred
4. Return `200 { ok: true }` on success
5. Return `500 { error: "..." }` if Airtable or Resend call fails (form shows a generic error, does not advance to confirmation)

**No npm packages required** — uses native `fetch` for both Airtable and Resend API calls.

## Environment Variables

| Variable | Purpose |
|---|---|
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | ID of the Airtable base (starts with `app`) |
| `AIRTABLE_TABLE_NAME` | Name of the table to write signups to |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `hello@edu.games`) |

These must be added to Vercel's environment variables (preview + production).

## Airtable Table Schema

| Field | Type | Notes |
|---|---|---|
| `Email` | Email | Primary field |
| `Roles` | Single line text | e.g. `"dev, edu"` |
| `SignedUpAt` | Date/time | ISO 8601 string |

## Error Handling

- Invalid email (client): inline red message below the form, no request sent
- Invalid email (server): `400`, form stays on email step with error message
- Airtable/Resend failure: `500`, form stays on role step with "Something went wrong — please try again" message
- Duplicate email in Airtable: Airtable will accept it (no dedup logic needed for now)

## Out of Scope

- Styled confirmation email (deferred)
- Deduplication of signups
- Analytics / tracking
- Unsubscribe flow

## Deployment Notes

- `index.html` is a static file — Vercel serves it automatically from the `Edugames/Landing/` directory
- `api/subscribe.js` must live at the repo root `api/` folder for Vercel's serverless function routing
- The existing `.dc.html` file can be kept as an archive or deleted
