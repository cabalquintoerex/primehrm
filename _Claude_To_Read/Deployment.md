# LGU PRIME-HRM — Linux Deployment (Ubuntu + Apache, shared server)

> **✅ DEPLOYED — LIVE since 2026-07-21** at **https://apps.cebu.gov.ph/llcprime**.
> Login verified, DB connected, HTTPS + secure cookies working, both live apps (`/access`,
> `/prime`) undisturbed. See **[Deployment Record (as-built)](#deployment-record-as-built-2026-07-21)**
> at the bottom for exactly what was done, the issues hit, and the open items.

| Setting | Value |
|---------|-------|
| Server | Ubuntu at **10.30.0.15** (shared — hosts other `apps.cebu.gov.ph` projects) |
| Public URL | **apps.cebu.gov.ph/llcprime** (sub-path) |
| Web server | **Apache 2.4.63** — HTTPS via Let's Encrypt (cert for `apps.cebu.gov.ph`); port 80 force-redirects to 443. `mod_rewrite`/`ssl` on; **`mod_proxy` must be enabled** |
| Deploy path | **`/var/www/html/llcprime/`** (matches the server's `/var/www/html/<app>` convention) |
| Backend | **Node/Express on port 5010**, run as a service, proxied by Apache |
| Database | **new `llcprime` MySQL DB + user** on the existing MySQL |
| Initial data | **demo seed** (Lapu-Lapu pilot) — see the caveat in step 8 |

> **Shared-server rule:** every change is *additive*. Apache config goes in its own
> `conf-available/llcprime.conf` enabled with `a2enconf` — it defines only the `/llcprime` URL
> space and never touches the other apps or the `apps.cebu.gov.ph` vhost. Always
> `sudo apache2ctl configtest` before reloading; it fails safe.

Config artifacts live in the repo's **`deploy/`** directory.

> **Confirmed on the box (discovery):** two live PHP apps share it — `/access` (CodeIgniter) and
> `/prime` (Laravel). Both are served directly by Apache+PHP, so neither runs a Node process — but
> **llcprime's backend is Node and must run as a service** (installing the `nodejs` package is
> isolated and does not affect the PHP apps). The `:443` vhost (`prime-le-ssl.conf`) carries a
> Let's Encrypt cert for `apps.cebu.gov.ph` and `:80` redirects to it, so **llcprime is HTTPS**
> (`COOKIE_SECURE=true`, `CORS_ORIGIN=https://...`). Our `conf-available/llcprime.conf` uses
> server-level `Alias`/`ProxyPass` that Apache inherits into the existing vhosts — we do **not**
> edit `prime.conf`/`prime-le-ssl.conf` (they serve the live apps)." 

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
sudo grep -Rl "apps.cebu.gov.ph" /etc/apache2/sites-enabled/   # -R (not -r): sites-enabled are symlinks
sudo grep -RiE "ServerName|VirtualHost|SSLEngine" /etc/apache2/sites-enabled/

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
> If HTTP-only, keep `NODE_ENV=production` but set `COOKIE_SECURE=false`. **On 10.30.0.15 the box
> is HTTPS** (Let's Encrypt), so `COOKIE_SECURE=true` — see the as-built record below.

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

---

## Deployment Record (as-built, 2026-07-21)

Executed interactively on the server (operator ran commands; the app was built + pushed from the
Mac). Everything below is confirmed, not assumed.

### The box, confirmed
| | |
|---|---|
| Host | `10.30.0.15`, Ubuntu 25.04, Apache 2.4.63, MySQL 8.4.7 |
| Scheme | **HTTPS** — Let's Encrypt cert for `apps.cebu.gov.ph` (`prime-le-ssl.conf`); `:80` force-redirects to `:443` |
| Node | **not present** — installed `nodejs` + `npm` from the distro repo (Node **20.18.1**, npm 9.2.0). It's the first Node-runtime app on the box; `/access` (CodeIgniter) and `/prime` (Laravel) are PHP, served directly by Apache |
| Backend | Node service on **:5010**, `systemd` unit `llcprime-api`, runs as `www-data`, `active (running)` |
| DB | `llcprime` database + `llcprime@localhost` user (caching_sha2_password); schema via `prisma db push`; demo seed loaded once |
| Apache | server-level `Alias`/`ProxyPass` in `conf-available/llcprime.conf` (a2enconf), inherited by the vhosts — the live vhost files were **not** edited. `a2enmod proxy proxy_http` + restart |
| Git | new read-only deploy key `github_primehrm_deploy` + `Host github.com-primehrm` alias (the existing config pins `github.com` to the access key with `IdentitiesOnly yes`) |

### Issues hit during deploy, and the fixes (all committed)
| Issue | Root cause | Fix |
|-------|-----------|-----|
| Frontend `npm run build` failed on the server | The real build script is `tsc -b && vite build`; two long-standing `suggestion-input.tsx` ref-type errors aborted `tsc` before Vite ran. My Mac builds used `vite build` directly and skipped the gate | Typed the refs `useRef<T \| null>(null)` to select the mutable-ref overload. **Always run `npm run build`, not `vite build`, to catch this class of error** |
| `git pull` blocked on the server | `git add -A` after a local build swept `client/tsconfig.tsbuildinfo` (a `tsc -b` artifact) into a commit; it collided with the server's own copy | Untracked it + added `*.tsbuildinfo` to `.gitignore` |
| systemd env parsing risk | The unit's `EnvironmentFile=` would have systemd parse the quoted `DATABASE_URL` (`mysql://user:pass@host`) — stricter than dotenv | Removed `EnvironmentFile`; the app calls `dotenv.config()` from its `WorkingDirectory` |
| HTTP-vs-HTTPS false alarm | Discovery `grep -r` **skips symlinks** in `sites-enabled/`, so it missed the vhosts and I first read the box as HTTP-only | Use `grep -R`. Box is HTTPS → `COOKIE_SECURE=true`, `CORS_ORIGIN=https://…` |

### Code that made sub-path + Apache deployment work (env/flag-driven; local dev unchanged)
- `VITE_BASE_PATH=/llcprime/` → Vite `base`; `App.tsx` router `basename`, axios `baseURL`, and the
  401 redirect from `import.meta.env.BASE_URL`; `lib/basePath.ts` prefixes DB-stored `/uploads/...`
  assets and real anchors
- `app.set('trust proxy', 1)` (real client IP in audit logs behind Apache)
- Env-driven `COOKIE_PATH=/llcprime` (don't leak cookies to sibling apps) and `COOKIE_SECURE=true`
  (decoupled from `NODE_ENV` so it can be toggled for HTTP vs HTTPS)

### Permissions (as set)
- `server/.env` → `640 root:www-data` (service reads it, others can't see the secrets)
- `server/uploads` → `www-data:www-data` (service writes uploads)
- Everything else root-owned, world-readable

### Open items
1. **`brylle` access is NOT locked down.** `brylle` is in **both** `www-data` and `sudo`. Because
   `brylle` has sudo (→ root), **no file permission can truly block them** — it would be deterrence
   only. Decision deferred; the operator opted to change `brylle`'s password for now. True isolation
   would require changing `brylle`'s sudo rights (a box-admin decision, since `brylle` manages
   `/prime`). If deterrence is later wanted: lock the folder to a **dedicated group** (not
   `www-data`, since `brylle` is in it) + strip `other`.
2. **Redeploy re-applies root ownership.** `git pull` runs as root and creates root-owned files with
   root's umask, so after a redeploy the `.env`/`uploads` perms above should be re-applied. Worth a
   small `deploy/set-perms.sh` if redeploys become frequent.
3. **Ubuntu 25.04 dropped `wtmp`/`utmp`** — `last`/`lastlog` are gone; use `journalctl -t sshd` for
   login history, `loginctl` for sessions.
4. **Branch not merged to `main`.** Deployed from `feat/rsp-appointment-forms-and-single-lgu-seed`.
   Merge to `main` when ready; redeploy then tracks `main`.

### Redeploy (as-built)
```bash
cd /var/www/html/llcprime && git pull
cd server  && npm ci && npx prisma generate && npm run build   # + npx prisma db push if schema changed
cd ../client && npm ci && VITE_BASE_PATH=/llcprime/ npm run build
sudo systemctl restart llcprime-api
# re-apply perms if a redeploy reset them:
sudo chown root:www-data server/.env && sudo chmod 640 server/.env
sudo chown -R www-data:www-data server/uploads
# NEVER run `npm run db:seed` again — it wipes the DB.
```
