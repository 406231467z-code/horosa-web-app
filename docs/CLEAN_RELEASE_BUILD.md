# CLEAN_RELEASE_BUILD

Release ships **only** production webpack output, not the dirty workspace.

## What ships

| Artifact | Purpose |
| --- | --- |
| `astrostudyui/dist/` | History-mode web (`publicPath: /static/`) |
| `astrostudyui/dist-file/` | Hash-mode / relative paths (`BUILD_FOR_FILE=1`) |

## What never ships

- `experiments/**/node_modules`
- `local/runtime/**` (JDK, Python, etc.)
- Java/Python source trees (reference only until Legacy Purge)
- `node_modules/`, logs, `.cursor/`

## Staging copy

```bash
node scripts/clean-release-artifact.mjs
```

Output: `release/CLEAN_RELEASE_BUILD/` with `dist-web/`, optional `dist-file/`, and `RELEASE_MANIFEST.json`.

## build-info.json

Written by `astrostudyui/scripts/write-build-info.js` after each build. Counts **only**:

`astrostudyui/src`, `package.json`, `.umirc.js`, `public`

`dirty: false` requires a **clean** production tree at build time (typically after commit). The field is **not** faked.

## Release tree vs dev tree

A large repo `git status` (docs, experiments, local/) is expected during migration. Release gate uses:

1. `RELEASE_MANIFEST.json` (artifact scan)
2. `build-info.json` dirty flag
3. `tests/final-parity/release-tree-audit.json` (classification)
