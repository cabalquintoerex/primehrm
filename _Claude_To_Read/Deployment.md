# LGU PRIME-HRM — Linux Deployment (Ubuntu, shared server)

Deploy target agreed with the team:

| Setting | Value |
|---------|-------|
| Server | Ubuntu at **10.30.0.15** (shared — hosts other `apps.cebu.gov.ph` projects) |
| Public URL | **https://apps.cebu.gov.ph/llcprime** (sub-path) |
| Backend port | **5010** (Node/Express; must not collide with other apps) |
| Database | **new `llcprime` MySQL DB + user** on the existing MySQL instance |
| Initial data | **demo seed** (Lapu-Lapu pilot data) — see the caveat in step 7 |
| Web server | **nginx** reverse proxy (assumed — adjust if the box uses Apache) |

> **Shared-server rule:** every change here is *additive*. The nginx edit adds three
> `location` blocks inside the existing `apps.cebu.gov.ph` server block — it never creates a new
> `server{}` and never touches the other apps. Always `sudo nginx -t` before reloading; it fails
> safe, leaving the running config intact if anything is wrong.

All config artifacts referenced below live in the repo's **`deploy/`** directory.

---

## Why a sub-path needs code (already done)

The app was built to run from `/`. Serving it under `/llcprime` required base-path awareness,
which is now driven entirely by **one build flag** — `VITE_BASE_PATH` — so local dev still runs at
`/` unchanged:

- `vite.config.ts` → `base: process.env.VITE_BASE_PATH || '/'`
- `App.tsx` → router `basename` from `import.meta.env.BASE_URL`
- `services/api.ts` → axios `baseURL`, token refresh, and the 401 redirect all use `BASE_URL`
- `lib/basePath.ts` → `withBasePath()` / `assetUrl()` prefix the base onto DB-stored `/uploads/...`
  asset paths and real `<a href>`/`window.open` navigations (these bypass the router)

Because the path is a build flag, **changing `/llcprime` to anything else is a rebuild, not a code
edit** — set `VITE_BASE_PATH` and the nginx path to match.

---

## One-time server setup

### 1. Prerequisites
```bash
node -v          # need Node 18+ (app developed on 20). If missing, install via nodesort/nvm
mysql --version  # existing MySQL 8.x
# pick the free backend port — confirm 5010 is not taken:
sudo ss -tlnp | grep ':5010' || echo "5010 is free"
```

### 2. Get the code onto the box
```bash
sudo mkdir -p /var/www/llcprime
sudo chown "$USER":"$USER" /var/www/llcprime
git clone <repo-url> /var/www/llcprime
cd /var/www/llcprime
git checkout <deploy-branch>     # the branch carrying these changes
```

### 3. Database
```bash
# Edit the password in deploy/create-db.sql first, then:
sudo mysql < deploy/create-db.sql
```

### 4. Backend — env, install, schema, build
```bash
cd /var/www/llcprime/server
cp ../deploy/server.env.example .env
# Edit .env: set the real DB password (matching step 3), and generate two secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_REFRESH_SECRET

npm ci
npx prisma generate
npx prisma db push          # creates all tables in the llcprime DB
npm run build               # tsc → dist/app.js  (exits 0)
mkdir -p uploads/logos uploads/headers uploads/documents   # ensure upload dirs exist
```

### 5. Frontend — build at the sub-path
```bash
cd /var/www/llcprime/client
npm ci
VITE_BASE_PATH=/llcprime/ npm run build      # → client/dist, all assets prefixed /llcprime/
```
> The trailing slash on `/llcprime/` matters — it is what Vite writes into every asset URL.

### 6. Run the backend as a service
Pick **one** — systemd (no extra dependency) or PM2 (if the other apps use it).

**systemd:**
```bash
sudo cp /var/www/llcprime/deploy/llcprime-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/llcprime-api.service   # set User + paths to match the box
sudo systemctl daemon-reload
sudo systemctl enable --now llcprime-api
sudo systemctl status llcprime-api
curl -s http://127.0.0.1:5010/api/health             # expect {"status":"ok",...}
```

**PM2 (alternative):**
```bash
cd /var/www/llcprime/server
pm2 start ../deploy/ecosystem.config.cjs
pm2 save        # (first time also run `pm2 startup` and follow its instructions)
```

### 7. Seed the demo data
```bash
cd /var/www/llcprime/server
npm run db:seed
```
> **⚠ The seed wipes the database on every run** (its first step is `deleteMany` across all
> tables). Run it exactly once, now, before real data exists. **Never re-run it after go-live** —
> it would delete real applications and appointments. For a clean production start instead of demo
> data, skip this step and create a super admin + the real LGU by hand.
>
> Demo logins after seeding: `superadmin`/`admin123`, `lapulapuhr`/`hradmin123`,
> `juandelacruz`/`applicant123`.

### 8. nginx — add the three location blocks
```bash
# Find the server block for apps.cebu.gov.ph:
grep -rl "apps.cebu.gov.ph" /etc/nginx/sites-available/ /etc/nginx/conf.d/ 2>/dev/null
sudo nano <that-file>
```
Paste the contents of **`deploy/nginx-llcprime.conf`** *inside* that
`server { server_name apps.cebu.gov.ph; ... }` block. Then:
```bash
sudo nginx -t                    # MUST pass before reloading
sudo systemctl reload nginx
```

### 9. Verify
```bash
curl -sI  https://apps.cebu.gov.ph/llcprime/            # 200, text/html
curl -s   https://apps.cebu.gov.ph/llcprime/api/health  # {"status":"ok",...}
```
Then in a browser:
- `https://apps.cebu.gov.ph/llcprime/` — login page renders (CSS + JS load, no 404s in console)
- `https://apps.cebu.gov.ph/llcprime/lapu-lapu-city/login` — branded login
- Sign in, hard-refresh on an inner page (e.g. `/llcprime/rsp/dashboard`) — SPA fallback works
- Upload an LGU logo (LGU Management) and confirm it displays — verifies the `/llcprime/uploads` path

---

## Redeploying after a code change

```bash
cd /var/www/llcprime
git pull

cd server && npm ci && npx prisma generate && npm run build
# If the schema changed:  npx prisma db push   (NEVER db:seed on live data)
sudo systemctl restart llcprime-api            # or: pm2 restart llcprime-api

cd ../client && npm ci && VITE_BASE_PATH=/llcprime/ npm run build
# nginx serves the new client/dist immediately — no reload needed unless the nginx conf changed
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Blank page, 404s for `/llcprime/assets/*` in console | Frontend built without `VITE_BASE_PATH=/llcprime/`, or nginx `alias` path wrong |
| API calls 404 / hit the wrong app | `location /llcprime/api/` missing or lacks the trailing slashes that strip the prefix |
| Hard refresh on an inner route → 404 | SPA fallback missing — the `try_files … /llcprime/index.html` line |
| LGU logo / document links broken | `location /llcprime/uploads/` missing, or `uploads/` dir absent / unwritable |
| 502 Bad Gateway | Backend not running (`systemctl status llcprime-api`) or wrong port in `.env` vs nginx |
| CORS error in console | `CORS_ORIGIN` in `server/.env` ≠ `https://apps.cebu.gov.ph` |
| `npm run build` (server) fails | Node < 18, or `npm ci` not run |

## Backups (shared DB)
Before any redeploy that runs `prisma db push`, snapshot just this app's database:
```bash
mysqldump llcprime > /var/backups/llcprime-$(date +%F).sql
```
