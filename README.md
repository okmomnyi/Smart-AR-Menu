# AR Menu Platform

A multi-tenant AR menu for restaurants. Guests scan a QR code at the table, browse a live
menu, and view any dish in augmented reality at true-to-life scale.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 3 |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | PostgreSQL 16 + Prisma |
| Auth | Email + password, scrypt hashing, JWT (access + refresh) |
| Storage | Cloudflare R2 |
| AR / 3D | Three.js, WebXR |

There is no Firebase dependency. Authentication is entirely self-hosted against PostgreSQL.

---

## Quick start

```bash
git clone <repo> && cd "Smart Menu System"
make dev          # starts PostgreSQL on :5434
```

Then, in two terminals:

```bash
cd backend && cp .env.example .env
# generate two DIFFERENT secrets and paste them into .env:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
npm install && npm run db:migrate && npm run db:seed && npm run dev
```

```bash
cd frontend && cp .env.example .env.local
npm install && npm run dev
```

The seed prints a demo email and password. Sign in at <http://localhost:3000/admin>, or
create your own account at <http://localhost:3000/admin/register>.

To run everything in Docker instead:

```bash
cp .env.docker .env    # fill in POSTGRES_PASSWORD and both token secrets
make up
```

---

## How authentication works

Passwords are hashed with **scrypt** (N=2¹⁷, r=8, p=1) using Node's built-in crypto, so there
is no native module to compile and no third-party auth service in the request path.

A session is two tokens:

| | Lifetime | Stored | Purpose |
|---|---|---|---|
| Access token | 15 minutes | JavaScript memory only | Sent as `Authorization: Bearer` on every API call |
| Refresh token | 30 days | `httpOnly` cookie scoped to `/auth` | Mints new access tokens |

The access token is deliberately never written to `localStorage` or a readable cookie: script
injected into the admin panel could read it there. The refresh token is `httpOnly`, so script
cannot read it either — and because the refresh endpoint is cookie-authenticated, it also
checks the `Origin` header to block cross-site invocation.

The two tokens are signed with **different secrets** and **different audiences**, so an access
token cannot be replayed as a refresh token or vice versa. Revocation works through
`User.token_version`: signing out or changing a password increments it, which invalidates every
outstanding refresh token for that user without needing a session table.

Run `npm run verify:auth` in `backend/` to exercise this (21 checks, no database required).

---

## Multi-tenancy

Every restaurant is isolated by `restaurant_id`, which comes from the **signed access token**,
never from the request body.

Two rules enforce it:

1. `requireTenant` rejects any request whose `:id` route parameter is not the caller's own
   restaurant.
2. Any request that references a category verifies that the category belongs to the caller's
   restaurant before writing.

Rule 2 matters more than it looks. The public menu is assembled by querying products by
`restaurant_id` and grouping them in application code — *not* by walking the category
relation. Doing it the other way round meant a tenant could file a product under another
restaurant's category id and have it render on that restaurant's public menu.

Products with no category are shown under a "More" heading rather than being dropped.

---

## API

### Public

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/menu/:slug` | Full menu: restaurant, categories, active products |

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create a user and restaurant. Returns an access token, sets the refresh cookie |
| POST | `/auth/login` | Sign in |
| POST | `/auth/refresh` | Exchange the refresh cookie for a new access token |
| POST | `/auth/logout` | Revoke every session for the user |
| GET | `/auth/me` | Current user and restaurant |
| POST | `/auth/change-password` | Change password; signs out other devices |

### Protected — `Authorization: Bearer <access token>`

| Method | Path | Description |
|---|---|---|
| PATCH | `/restaurants/:id` | Update name, accent colour, logo |
| GET | `/restaurants/:id/products` | List products |
| POST | `/restaurants/:id/products` | Create a product |
| PATCH | `/restaurants/:id/products/:pid` | Update a product |
| DELETE | `/restaurants/:id/products/:pid` | Hide from the menu (reversible) |
| DELETE | `/restaurants/:id/products/:pid/permanent` | Delete and free its media |
| GET | `/restaurants/:id/categories` | List categories |
| POST | `/restaurants/:id/categories` | Create a category |
| PUT | `/restaurants/:id/categories/order` | Persist a whole reorder in one request |
| PATCH | `/restaurants/:id/categories/:cid` | Rename or reorder one |
| DELETE | `/restaurants/:id/categories/:cid` | Delete; its products become uncategorised |
| POST | `/upload/image` | Upload a photo, returns a public URL |
| POST | `/upload/model` | Upload a `.glb`, returns a public URL |
| GET | `/upload/usage` | Storage used against quota |

All request bodies are validated with Zod. `prices` is derived server-side from `sizes`, so
the two can never disagree.

### Rate limits

| Scope | Limit |
|---|---|
| `/auth/login`, `/auth/register` | 10 per 15 min, keyed by IP **and** email |
| Other `/auth` | 100 per 15 min |
| `/upload` | 60 per hour |
| `/menu`, `/health` | 120 per minute |
| Everything else | 120 per minute |

Keying credentials on IP *and* email means one attacker cannot lock every account from a
single address, and a botnet cannot spread an attack on one account across many addresses.

> **`TRUST_PROXY_HOPS` must match your deployment.** It is the number of reverse proxies in
> front of the API — 1 on Railway, Render or Fly; 0 for plain Docker Compose. Set it too high
> and a client can forge `X-Forwarded-For` to defeat every limit above. Never set it to `true`.

---

## Product data

`sizes` drives both pricing and AR scale:

```json
[
  { "label": "S", "cm": 22, "price": 10.50 },
  { "label": "M", "cm": 30, "price": 14.00 },
  { "label": "L", "cm": 38, "price": 18.50 }
]
```

`cm` is the real-world width of the dish. The AR viewer normalises the model's bounding box to
that width, so **the number has to be measured, not guessed** — it is what makes the AR view
truthful.

---

## AR

`/r/[slug]/ar/[productId]` renders in one of two modes on a single WebGL context:

- **3D preview** (always available): orbit controls, drag to rotate, pinch to zoom. Auto-rotation
  is disabled when the OS requests reduced motion.
- **AR** (WebXR `immersive-ar` with `hit-test`): a reticle tracks the detected surface, tap to
  place. The control panel is passed to the session as a `domOverlay` root, so price, size
  selection and the exit control stay visible and usable inside AR.

Scale is computed as `target_cm / 100 / horizontal_extent_of_bounding_box`, applied identically
on load and on every size change, and eased over frames rather than snapping.

Everything is torn down on unmount: animation loop, hit-test source, XR session, orbit
controls, geometries, materials, textures, and the renderer.

---

## Storage

Uploads go to Cloudflare R2 and are tracked in an `Asset` table, which makes two things
possible that were not before:

- **Quota.** Each restaurant has a byte ceiling (2 GiB by default). The check and the
  bookkeeping happen in one transaction, so parallel uploads cannot overshoot it.
- **Reclamation.** Replacing a photo or deleting a product deletes the underlying object and
  credits the bytes back, instead of orphaning it forever.

Images are re-encoded to WebP with sharp, which strips metadata and guarantees the stored file
is a real image. `.glb` uploads are checked for the glTF magic bytes, not just the file
extension.

---

## Deployment

### Production: menu.kelvinmomanyi.me

One hostname serves both halves. A Cloudflare Tunnel on the server sends
`/api/*` to the API and everything else to the web app, so there is no second
subdomain, no CORS, and the refresh cookie is same-site.

| Piece | Where |
|---|---|
| Images | Built for arm64 by `.github/workflows/images.yml` and pushed to GHCR |
| Stack | `deploy/docker-compose.prod.yml`, run from `/opt/ar-menu` on the server |
| Secrets | `/opt/ar-menu/.env` on the server only, from `deploy/.env.example` |
| HTTPS | The existing `cloudflared-lfr` tunnel, config in `~/.cloudflared/config.yml` |

The server never builds images. It is a single-core instance shared with other
services, and a Next.js build would starve them.

To release a commit:

```bash
cd /opt/ar-menu
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=sha-<commit>/" .env
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Migrations run automatically when the API container starts.

Tunnel ingress, with the API rule first because rules match in order:

```yaml
- hostname: menu.kelvinmomanyi.me
  path: ^/api(/|$)
  service: http://localhost:4000
- hostname: menu.kelvinmomanyi.me
  service: http://localhost:3000
```

The API runs with `API_PATH_PREFIX=/api`, which strips the prefix before routing
and scopes the refresh cookie to `/api/auth`. `TRUST_PROXY_HOPS` is `1` for the
tunnel.

Uploaded photos and models are served by the API at `/api/media/...`, read
from R2 with the same keys that write them. That needs no public bucket URL and
no bucket CORS rules, and the 3D viewer loads models from the site's own
origin. `R2_PUBLIC_URL` is set to that route; pointing it at a public bucket
domain instead switches to direct delivery with no code change.

### Elsewhere

**Backend:** any Node 22 host with PostgreSQL. Set every variable in
`backend/.env.example` and set `TRUST_PROXY_HOPS` to your real proxy count.
The Docker entrypoint applies migrations on start.

**Frontend:** `NEXT_PUBLIC_*` values are inlined at build time, so set them
before the build. Set `NEXT_PUBLIC_MEDIA_HOSTNAME` if a custom domain fronts R2.

If the API is on a different site from the web app, the refresh cookie must be
`SameSite=None; Secure`, so both have to be served over HTTPS.

---

## Design system

Two surfaces: the customer menu is dark (read at a table, in low light, next to the food); the
admin panel is light (a data tool used on a laptop). Both draw from one palette, one type
scale and one spacing scale, defined in `frontend/tailwind.config.ts`.

Amber carries the brand at two strengths, because one cannot do both jobs: `#D4820A` is bright
enough to read on the dark menu but only reaches 2.7:1 on the light admin background, so filled
buttons and admin text use a deeper `#A05F09` / `#8A5206`. Every pairing meets WCAG AA.

Icons are lucide-react throughout. A restaurant's chosen accent colour is applied at runtime,
and the branding screen warns when a colour fails contrast rather than silently shipping an
unreadable menu.

---

## Known gaps

Honest list of what is not done:

- **The 3D models in the seed are placeholders.** They are Khronos glTF sample assets — a duck
  standing in for a burger. Every one needs replacing with a scan of the real dish, and the
  photography is Unsplash stock rather than the restaurant's own.
- **No automated test suite.** `npm run verify:auth` covers the auth primitives and
  `make check` covers types and builds, but there are no integration or end-to-end tests.
- **No ordering.** This is a menu, not a point of sale. There is deliberately no cart.
- **The legal pages carry bracketed placeholders** for the operating entity, contact addresses
  and jurisdiction. They describe what the software actually does, but they must be completed
  and reviewed by a lawyer before launch.
- **Model file sizes are not enforced beyond the 40 MB cap.** A 30 MB `.glb` will still be a
  poor experience over mobile data; Draco or meshopt compression is not yet applied.
