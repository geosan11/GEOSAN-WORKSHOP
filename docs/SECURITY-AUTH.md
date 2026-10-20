# Browser sign-in and sessions

How the browser side of sign-in works (PR #7). The database rules in
[SECURITY-DB.md](SECURITY-DB.md) are the real lock; everything here is the
second layer and the session handling around it.

## Who can sign in

- **Owner only.** Set `VITE_OWNER_USER_ID` to your Supabase user id (Supabase
  dashboard > Authentication > Users > UID). Any other account is signed
  straight back out with "This app is locked to its owner."
- `VITE_OWNER_EMAILS` is optional and only used when no owner id is set.
  **It ends up in the public JS bundle** (every `VITE_*` value does), so
  anyone who opens the site can read it. Prefer the id.
- The code reads each variable by its full name
  (`import.meta.env.VITE_OWNER_USER_ID`, etc.), never `import.meta.env` as a
  whole, so Vite inlines only those values and not every `VITE_*` variable.
  A test (`owner config reads each VITE_ variable by name`) guards this.
- The offline "staff operator" fallback only works with `VITE_DEMO_MODE=true`
  on a page served from exactly `localhost`, `127.0.0.1` or `[::1]`.
- Server side, `server/ownerCheck.js` refuses to start when Supabase auth is
  configured without `OWNER_USER_ID`.

## Sessions and refresh

The session (access token, refresh token, `expiresAtLocal`) is stored under
the existing `ehi_auth_session` localStorage key.

- **Timing uses the device clock only.** When a token arrives we store
  `expiresAtLocal = (local time the request was sent) + expires_in`. The JWT
  `exp` and Supabase's `expires_at` are server-clock times and are never
  compared with `Date.now()`, so a device clock that is minutes or hours off
  neither loops refreshes nor keeps a token past its real expiry. A session
  saved by an older build (no `expiresAtLocal`) is refreshed once.
- We refresh 60 s before the local expiry (or at half the lifetime for very
  short tokens), on a timer while idle, and once after a 401. Parallel
  requests share one refresh.
- **Never more than one refresh per 5 s.** Failed refreshes, and successful
  ones that come within 30 s of the previous one, back off exponentially
  (5 s, 10 s, 20 s … up to 5 min).
- An expired access token is never sent; the request goes out with the anon
  key only.
- **We sign out only when Supabase definitively rejects the refresh token**
  (400/401 with `invalid_grant`, or `refresh_token_not_found`,
  `refresh_token_already_used`, `session_not_found`, `session_expired`,
  `user_not_found`, `user_banned`). On a network error, a 5xx, a 429 or an
  unrecognised response the session is kept and the refresh is retried with
  backoff, and straight away on the browser's `online` event. Being offline
  when the token expires does not sign you out.
- **Tabs stay in sync.** Each tab listens for the `storage` event on
  `ehi_auth_session`: a sign-out in one tab signs the others out, and a
  refresh or sign-in in one tab is picked up by the others without a second
  refresh.
- Sign-out clears the key and revokes the refresh token on the server
  (`/auth/v1/logout`).

## Known trade-off: refresh token in localStorage

The refresh token is kept in localStorage so the session survives reloads
without a backend session. That widens what an XSS bug could steal: not just
a short-lived access token but a long-lived refresh token that can mint new
ones until it is revoked. We accept this for now. The mitigations, and where
each one stands today:

- **Content-Security-Policy.** *Not set yet* (`vercel.json` has no headers).
  Follow-up: add a CSP header in `vercel.json` with `script-src 'self'`, no
  `unsafe-inline`/`unsafe-eval`, and `connect-src 'self'` plus the Supabase
  project URL. Google Fonts would need `style-src`/`font-src` entries.
- **No third-party scripts.** In place: `index.html` loads only our own
  bundle. Google Fonts is CSS and font files only, no JavaScript. Keep it that
  way (no analytics or widget scripts).
- **Revoke on logout.** In place: sign-out calls `/auth/v1/logout`, and
  Supabase rotates the refresh token on every refresh, so a stolen one stops
  working after the next legitimate refresh or sign-out.

Moving the refresh token to an httpOnly cookie behind our own server would
remove this risk and is the option if the threat model changes.
