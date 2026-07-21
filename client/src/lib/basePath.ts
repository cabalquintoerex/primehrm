/**
 * The app can be served from the site root (dev, `/`) or under a sub-path in production
 * (e.g. `/llcprime/`). Vite's `base` config drives `import.meta.env.BASE_URL`, which is `/` at
 * root and `/llcprime/` under a sub-path.
 *
 * React Router (`basename`) and the axios `baseURL` handle in-app routes and API calls, but three
 * things bypass them and need the prefix applied by hand:
 *   - `<img src>` / CSS `url()` pointing at DB-stored `/uploads/...` asset paths
 *   - real `<a href>` / `window.open` to app routes (a browser navigation, not a router push)
 *   - `fetch()` of an uploaded asset
 *
 * `withBasePath` prefixes those. It is a no-op at root, so the same code works in dev and prod.
 */
export function withBasePath(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path; // already absolute — leave it
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // '' at root, '/llcprime' under a sub-path
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/** Alias read more naturally at asset call sites. */
export const assetUrl = withBasePath;
