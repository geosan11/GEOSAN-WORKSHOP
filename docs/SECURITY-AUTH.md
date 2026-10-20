# Browser sign-in and sessions

How the browser side of sign-in works (PR #7). The database rules in
[SECURITY-DB.md](SECURITY-DB.md) are the real lock; everything here is the
second layer and the session handling around it.

## Who can sign in

- **Owner only.** Set `VITE_OWNER_USER_ID` to your Supabase user id (Supabase
  dashboard > Authentication > Users > UID). Any other account is signed
  straight back out with "This app is locked to its owner."
- **Fails closed.** Both settings are trimmed and split on commas, and an
  empty, whitespace-only or commas-only value (`' '`, `' , '`) counts as
  unset. With no owner id and no owner email left, *every* account is refused
  ("Sign-in is locked: no owner is configured"). The localhost demo mode
  (`VITE_DEMO_MODE=true`) is unaffected.
- `VITE_OWNER_EMAILS` is optional and only used when no owner id is set.
  When `VITE_OWNER_USER_ID` is set, the email is left out of the build
  entirely (`import.meta.env.VITE_OWNER_USER_ID?.replaceAll(',', '').trim() ?
  undefined : import.meta.env.VITE_OWNER_EMAILS`, which Vite folds away; a
  blank id counts as unset here too). When only the
  email is set, **it is in the public JS bundle** and anyone who opens the
  site can read it. Prefer the id. A test builds the app with sentinel values
  and checks this.
- The code reads each variable by its full name
  (`import.meta.env.VITE_OWNER_USER_ID`, etc.), never `import.meta.env` as a
  whole, so Vite inlines only those values and not every `VITE_*` variable.
  A test (`owner config reads each VITE_ variable by name`) guards this.
- The offline "staff operator" fallback only works with `VITE_DEMO_MODE=true`
  on a page served from exactly `localhost`, `127.0.0.1` or `[::1]`.
- Server side, `server/ownerCheck.js` holds the proxy's owner check. See
  "Server owner check and proxy cache" below for when it becomes active.

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
  ones that come sooner than min(30 s, lifetime / 4) after the previous one,
  back off exponentially (5 s, 10 s, 20 s … up to 5 min). Scaling the
  "too soon" window with the lifetime keeps very short-lived tokens on their
  normal schedule.
- If the token endpoint gives no usable `expires_in` (missing, 0 or not a
  number) and the JWT has no `exp - iat`, the new (rotated) tokens are still
  saved, with a conservative 5 min local expiry.
- An expired access token is never sent; the request goes out with the anon
  key only.
- **15 s request timeout.** Refresh and sign-out requests to Supabase are
  aborted after 15 s. A timed-out refresh counts as a network error (session
  kept, retried with backoff), and it bounds how long a tab can hold the
  refresh lock. A tab waiting for the lock gives up after 20 s (e.g. another
  tab was frozen while holding it), also without signing out.
- **Token lifetimes under about 10 s are not supported well.** We never
  refresh more than once per 5 s and refresh at half the lifetime, so tokens
  that short may expire between refreshes (requests then go out signed out
  until the next refresh). Supabase's default is 3600 s.
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
- **One refresh across tabs.** Refreshes run under
  `navigator.locks.request('ehi_auth_refresh', …)` (run directly where Web
  Locks are unavailable). Inside the lock the tab re-reads storage; if another
  tab has already stored a newer, valid token, it adopts it and makes no
  network call. If Supabase rejects our refresh token but storage now holds a
  different (newer) refresh token, we adopt that instead of signing out.
- **Remaining race without Web Locks.** `navigator.locks` exists only in
  secure contexts (HTTPS, or `http://localhost`) on current browsers. On older
  browsers, and on **plain-http pages opened by LAN address** (e.g.
  `http://192.168.1.5:3000`), there is no lock: two tabs can still refresh at
  the same moment with the same refresh token. The losing tab then adopts the
  winner's token from storage, *if* the winner has saved it by the time the
  rejection arrives. If not, the losing tab signs out (the other tab stays
  signed in). Supabase's refresh-token reuse interval (10 s by default) makes
  this rare.
- **A sign-out always wins over an in-flight refresh.** Each sign-in,
  sign-out and cross-tab change bumps a session generation. A refresh result
  is saved only if the generation is unchanged and the stored refresh token
  is still the one that was sent; otherwise it is discarded.
- Sign-out clears the key, then (best effort, at most 2 s) calls the
  pre-sign-out hook so our proxy drops the token from its cache (wired up by
  the #3 follow-up patch, see below), then revokes the refresh token on
  Supabase (`/auth/v1/logout`).

## Server owner check and proxy cache

- **Not active yet.** `server/ownerCheck.js` ships in this PR but is only
  wired into the proxy (`server/proxySecurity.js`) by the follow-up patch to
  #3, which lands **after #7 merges** (and after #3).
- **Once that patch lands, the proxy refuses to start without
  `OWNER_USER_ID`** when Supabase auth is configured. Set `OWNER_USER_ID`
  (your Supabase user id; optional extra ids in `ALLOWED_USER_IDS`) where
  `server.js` runs **before deploying it**.
- **Signed-out tokens and the proxy's session cache.** The proxy caches each
  validated Supabase token so it doesn't call Supabase on every request. On
  #3 as it stands, a token can still be accepted from that cache for **up to
  60 s** after sign-out (or after it expires). The follow-up patch cuts this
  two ways: entries last at most min(10 s, the token's `exp`) and are dropped
  when Supabase answers 401/403, and sign-out calls the authenticated
  `POST /api/auth/signout`, which drops the token from the cache at once.
  What remains: if that call fails (proxy unreachable, page closed), the
  token can still be accepted for **up to 10 s**, and only by a proxy process
  that cached it.

## After deploying this change

- **Everyone signs in once more.** Sessions saved by older builds either have
  no refresh token or no local expiry (`expiresAtLocal`); the first can't be
  refreshed and the app no longer trusts the JWT `exp` against the device
  clock, so expect one extra sign-in per browser after deploy.
- Set `VITE_OWNER_USER_ID` **before** deploying: without it nobody can sign
  in (fail closed).

## Known trade-off: refresh token in localStorage

The refresh token is kept in localStorage so the session survives reloads
without a backend session. That widens what an XSS bug could steal: not just
a short-lived access token but a long-lived refresh token that can mint new
ones until it is revoked. We accept this for now. The mitigations, and where
each one stands today:

- **Content-Security-Policy.** *Not set yet.* On `main`, `vercel.json` now has
  `headers` (Cache-Control for `/assets/*`, `/index.html` and `/`), but still
  no CSP. Follow-up: add a CSP header there with `script-src 'self'`, no
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
