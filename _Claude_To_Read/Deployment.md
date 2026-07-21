# LGU PRIME-HRM — Linux Deployment (Ubuntu + Apache, shared server)

| Setting | Value |
|---------|-------|
| Server | Ubuntu at **10.30.0.15** (shared — hosts other `apps.cebu.gov.ph` projects) |
| Public URL | **apps.cebu.gov.ph/llcprime** (sub-path) |
| Web server | **Apache 2.4** (same family as the ACCESS project box; `mod_rewrite`/`ssl` enabled, `AllowOverride All` on `/var/www/`) |
| Deploy path | **`/var/www/html/llcprime/`** (matches the server's `/var/www/html/<app>` convention) |
| Backend | **Node/Express on port 5010**, run as a service, proxied by Apache |
| Database | **new `llcprime` MySQL DB + user** on the existing MySQL |
| Initial data | **demo seed** (Lapu-Lapu pilot) — see the caveat in step 8 |

> **Shared-server rule:** every change is *additive*. Apache config goes in its own
> `conf-available/llcprime.conf` enabled with `a2enconf` — it defines only the `/llcprime` URL
> space and never touches the other apps or the `apps.cebu.gov.ph` vhost. Always
> `sudo apache2ctl configtest` before reloading; it fails safe.

Config artifacts live in the repo's **`deploy/`** directory.

> **Not PHP:** the ACCESS convention (PHP under Apache's DocumentRoot with `.htaccess`) does not
> apply to the Node backend. PRIME's backend is a separate Node process on 5010; Apache only
> **proxies** `/llcprime/api` + `/llcprime/uploads` to it and **serves** the built React static
> files. `ProxyPass` is not allowed in `.htaccess`, which is why the config is a conf file.

---

## 0. Discovery — confirm the box matches these assumptions FIRST

Run these read-only checks and share the output before changing anything. They confirm 10.30.0.15
really mirrors the ACCESS setup and reveal the two unknowns that affect config (the vhost scheme
and a free port):

```bash
# identity + web server
hostname -I; lsb_release -d
apache2 -v
apache2ctl -M 2>/dev/null | grep -E 'proxy_module|proxy_http|rewrite|ssl'   # which are already on

# the apps.cebu.gov.ph vhost — HTTP or HTTPS? which file?
sudo grep -rl "apps.cebu.gov.ph" /etc/apache2/sites-enabled/
sudo grep -rE "ServerName|VirtualHost|SSLEngine" /etc/apache2/sites-enabled/ | grep -iA2 apps.cebu.gov.ph

# runtimes
node -v; npm -v; which node
mysql --version

# is the backend port free?
sudo ss -tlnp | grep ':5010' || echo "5010 free"

# what's already at /var/www/html (so we don't clash)
ls -la /var/www/html/
```

> **Why the scheme matters:** the app sets `secure` cookies in production. If `apps.cebu.gov.ph` is
> **HTTPS**, everything is fine. If it's **HTTP only**, the browser won't send those cookies and the
> silent token-refresh path breaks (login still works — it uses a Bearer token in localStorage).
> If HTTP-only, set `NODE_ENV=production` but we'll flip the cookie `secure` flag off via env.
> Tell me the scheme and I'll adjust before we build.

---

## Why a sub-path needs code (already done, in the repo)

Driven by one build flag (`VITE_BASE_PATH`) so local dev still runs at `/`:
- `vite.config` `base`, `App.tsx` router `basename`, axios `baseURL`/refresh/401-redirect — all from
  `import.meta.env.BASE_URL`
- `lib/basePath.ts` (`withBasePath`/`assetUrl`) prefixes the base onto DB-stored `/uploads/...`
  assets and real `<a href>`/`window.open` navigations
- Server: `app.set('trust proxy', 1)` (real client IP in audit logs behind Apache) and
  env-driven `COOKIE_PATH` (scopes cookies to `/llcprime`)

Changing the path later is a rebuild + config edit, not a code change.

---

## One-time setup

### 1. Code onto the box (git, matching ACCESS conventions)
```bash
sudo mkdir -p /var/www/html/llcprime
sudo chown "$USER":"$USER" /var/www/html/llcprime
git clone <repo-url> /var/www/html/llcprime      # or via the /root/.ssh deploy key as ACCESS does
cd /var/www/html/llcprime
git checkout <deploy-branch>
git config core.fileMode false                   # avoid phantom chmod diffs on Linux
```

### 2. Database
```bash
# edit the password in deploy/create-db.sql first
sudo mysql < deploy/create-db.sql
```

### 3. Backend — env, install, schema, build
```bash
cd /var/www/html/llcprime/server
cp ../deploy/server.env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_REFRESH_SECRET
nano .env      # set DB password (match step 2), the two secrets, confirm PORT=5010, CORS_ORIGIN, COOKIE_PATH

npm ci
npx prisma generate
npx prisma db push
npm run build
mkdir -p uploads/logos uploads/headers uploads/documents
```

### 4. Frontend — build at the sub-path
```bash
cd /var/www/html/llcprime/client
npm ci
VITE_BASE_PATH=/llcprime/ npm run build     # → client/dist, assets prefixed /llcprime/
```

### 5. Backend service (systemd or PM2 — match what the other apps use)
```bash
# systemd:
sudo cp /var/www/html/llcprime/deploy/llcprime-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/llcprime-api.service     # set User + confirm paths
sudo systemctl daemon-reload && sudo systemctl enable --now llcprime-api
curl -s http://127.0.0.1:5010/api/health               # {"status":"ok",...}
```

### 6. Apache modules + config
```bash
sudo a2enmod proxy proxy_http rewrite
sudo cp /var/www/html/llcprime/deploy/apache-llcprime.conf /etc/apache2/conf-available/llcprime.conf
sudo a2enconf llcprime
sudo apache2ctl configtest        # MUST say "Syntax OK"
sudo systemctl reload apache2
```

### 7. Verify
```bash
curl -sI  http://apps.cebu.gov.ph/llcprime/            # (or https) → 200 text/html
curl -s   http://apps.cebu.gov.ph/llcprime/api/health  # {"status":"ok",...}
```
Browser: load `/llcprime/`, sign in, hard-refresh an inner route, upload an LGU logo (checks the
`/llcprime/uploads` proxy).

### 8. Seed the demo data
```bash
cd /var/www/html/llcprime/server && npm run db:seed
```
> **⚠ Wipes the DB on every run.** Once only, before real data exists. Never after go-live.
> Demo logins: `superadmin`/`admin123`, `lapulapuhr`/`hradmin123`, `juandelacruz`/`applicant123`.

---

## Redeploy after a change
```bash
cd /var/www/html/llcprime && git pull
cd server && npm ci && npx prisma generate && npm run build   # + npx prisma db push if schema changed
sudo systemctl restart llcprime-api
cd ../client && npm ci && VITE_BASE_PATH=/llcprime/ npm run build
# Apache serves the new dist immediately; reload only if apache-llcprime.conf changed.
```

## Troubleshooting
| Symptom | Cause |
|---------|-------|
| Blank page, 404s on `/llcprime/assets/*` | Built without `VITE_BASE_PATH=/llcprime/`, or `Alias` path wrong |
| API 404 / hits another app | `ProxyPass /llcprime/api` missing, or `mod_proxy` not enabled (`a2enmod proxy proxy_http`) |
| Hard refresh on inner route → 404 | SPA `RewriteRule` missing from the `<Directory>` block |
| Logo/document links broken | `ProxyPass /llcprime/uploads` missing, or `uploads/` absent/unwritable |
| 503 Service Unavailable | Backend down (`systemctl status llcprime-api`) or wrong port |
| Login works but silently logs out | HTTP-only site + `secure` cookies — see the scheme note in §0 |
| CORS error | `CORS_ORIGIN` ≠ the real scheme+host of apps.cebu.gov.ph |

## Backup before schema redeploys
```bash
mysqldump llcprime > /var/backups/llcprime-$(date +%F).sql
```
