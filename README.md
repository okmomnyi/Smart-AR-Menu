# AR Menu Platform

A complete, multi-tenant AR menu platform for restaurants. Customers scan a QR code to browse a live menu and view food items in augmented reality at true-to-life scale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | Firebase Authentication + Admin SDK |
| Storage | Firebase Storage (.glb models, images) |
| AR / 3D | Three.js, WebXR API, MindAR.js |
| Deployment | Vercel (frontend) + Railway (backend + DB) |

---

## Project Structure

```
/
├── frontend/                   Next.js 14 app
│   ├── app/
│   │   ├── r/[slug]/           Customer menu page
│   │   ├── r/[slug]/ar/[id]/   AR viewer
│   │   ├── admin/              Admin login
│   │   ├── admin/dashboard/
│   │   ├── admin/products/
│   │   ├── admin/categories/
│   │   └── admin/branding/
│   ├── components/
│   ├── lib/
│   └── app/globals.css
│
├── backend/                    Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── controllers/
│   │   └── lib/
│   └── prisma/
│       └── schema.prisma
│
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Railway)
- Firebase project (Auth + Storage enabled)

---

### 1. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication → Email/Password**
4. Enable **Storage** (start in production mode, configure rules below)
5. Go to **Project Settings → Service Accounts → Generate New Private Key** — download the JSON
6. Go to **Project Settings → General** — copy the web app config

**Firebase Storage Rules** (set in the console):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /models/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Fill in `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/ar_menu"
PORT=4000
FRONTEND_URL="http://localhost:3000"

# From Firebase service account JSON:
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
```

Run database migrations and start:
```bash
npm run db:generate
npm run db:push        # or: npm run db:migrate (production)
npm run dev
```

Backend runs at `http://localhost:4000`.

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
```

Fill in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# From Firebase web app config:
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

Start:
```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## API Reference

### Public Routes

| Method | Path | Description |
|---|---|---|
| GET | `/menu/:slug` | Full menu (restaurant + active categories + products) |
| GET | `/restaurants/:slug` | Restaurant info + categories |

### Auth Routes

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create user + restaurant |
| POST | `/auth/verify` | Verify Firebase token, return user record |

**Register body:**
```json
{
  "firebaseToken": "...",
  "restaurantName": "My Restaurant",
  "email": "admin@example.com"
}
```

### Protected Routes (require `Authorization: Bearer <token>`)

**Restaurants**
| Method | Path | Description |
|---|---|---|
| PATCH | `/restaurants/:id` | Update name, logo, theme color |

**Products**
| Method | Path | Description |
|---|---|---|
| GET | `/restaurants/:id/products` | List all products |
| POST | `/restaurants/:id/products` | Create product |
| PATCH | `/restaurants/:id/products/:pid` | Update product |
| DELETE | `/restaurants/:id/products/:pid` | Soft delete (active → false) |

**Categories**
| Method | Path | Description |
|---|---|---|
| GET | `/restaurants/:id/categories` | List categories |
| POST | `/restaurants/:id/categories` | Create category |
| PATCH | `/restaurants/:id/categories/:cid` | Update category |
| DELETE | `/restaurants/:id/categories/:cid` | Delete category |

**Uploads**
| Method | Path | Description |
|---|---|---|
| POST | `/upload/image` | Upload image → returns Firebase Storage URL |
| POST | `/upload/model` | Upload .glb model → returns Firebase Storage URL |

Upload requests are `multipart/form-data` with a `file` field.

---

## Product Data Schema

**sizes** field (JSON array):
```json
[
  { "label": "S", "cm": 20, "price": 8.99 },
  { "label": "M", "cm": 25, "price": 11.99 },
  { "label": "L", "cm": 30, "price": 14.99 }
]
```

**prices** field (JSON object, mirrors sizes for quick lookup):
```json
{ "S": 8.99, "M": 11.99, "L": 14.99 }
```

---

## AR System

The AR viewer (`/r/[slug]/ar/[productId]`) works as follows:

1. **Model Loading**: GLTFLoader loads the `.glb` file from Firebase Storage
2. **Scale Computation**: Bounding box is computed → `scale = diameter_cm / (bbox.x * 100)`
3. **WebXR Session**: Requests `immersive-ar` with `hit-test` feature
4. **Surface Detection**: Hit-test ray detects horizontal planes; amber ring pulses while searching
5. **Placement**: User taps → model placed at hit position
6. **Size Change**: User selects S/M/L → scale recomputed, model animates to new size

**Fallback** (when WebXR is not supported):
- Interactive Three.js canvas with OrbitControls
- Touch: swipe to rotate, pinch to zoom
- Dimensions overlay shown

---

## Deployment

### Backend → Railway

1. Create a new Railway project
2. Add a PostgreSQL database service
3. Deploy the `backend/` directory
4. Set all env vars from `.env.example` in Railway dashboard
5. Run `npm run db:migrate` via Railway console

### Frontend → Vercel

1. Import the `frontend/` directory to Vercel
2. Set all `NEXT_PUBLIC_*` env vars in Vercel dashboard
3. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Deploy

---

## Multi-Tenancy

- Each restaurant has an isolated slug and UUID
- All protected API routes verify the Firebase token, look up the user, and enforce that `restaurant_id` matches the route parameter
- Admins can only read/write their own restaurant's data
- Public routes (`/menu/:slug`, `/r/[slug]`) are read-only with no auth required

---

## QR Code

From `/admin/branding`, admins can generate and download a QR code that links to `https://yourdomain.com/r/[slug]`. Style: charcoal modules on cream background. Download as PNG.

---

## Design System

| Token | Value |
|---|---|
| `--cream` | `#F5F0E8` |
| `--warm-white` | `#FDFAF5` |
| `--charcoal` | `#1A1814` |
| `--brown` | `#3D2B1F` |
| `--amber` | `#D4820A` |
| `--amber-light` | `#F0A830` |
| `--amber-glow` | `#FFD580` |
| `--rust` | `#C14B1E` |
| `--sage` | `#6B7C5E` |
| `--muted` | `#8A7D70` |

**Fonts**: Playfair Display (headings) · DM Sans (body) · Space Mono (prices)
