# Static hosting SPA fallback

Production `dist/` uses **browser history** (`publicPath: /static/`). Deep links such as `/fengshui` require the host to serve `index.html` for unknown paths so the Umi app boots and `src/pages/404.js` can redirect to `/`.

## Requirement

```text
unknown path → index.html (200)
/static/*    → file under dist/static/, else same basename under dist/ (Umi async chunks)
/            → index.html
*.js / *.css under /static/ must never fall back to index.html (would break the app)
```

Client behavior (unchanged): `404.js` replaces non-`/` pathname with `/` after ~80ms.

## Minimal deploy configs

**nginx**

```nginx
root /var/www/horosa/dist;

# Web build: entry in /static/umi.*; lazy chunks may only exist at dist root.
location ~ ^/static/(.+\.(js|css|woff2?|png|jpe?g|svg|ico|json|map))$ {
  try_files /static/$1 /$1 =404;
}
location / {
  try_files $uri $uri/ /index.html;
}
```

**IIS / Azure Static Web Apps**: enable SPA fallback / rewrite all to `/index.html` except `/static/*`.

**`dist-file/`** (hash router): use `index.html#/` for file protocol; pathname redirects in `404.js` still apply for embedded hosts.

## Verification

`node tests/final-parity/closure-static-runtime.mjs` — serves `dist/` with SPA fallback (`spa-static-server.mjs`) and checks removed routes return home UI without calc network.
