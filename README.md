# MemShift — Your Internet Memory

> **Privacy-first personal memory layer for the internet.**
> Official Chromium browser extension (Chrome, Edge, Brave) with a shared codebase and optional Firefox prep package.

---

## Supported browsers

| Browser | Status |
|---|---|
| **Google Chrome** | Supported — Chromium MV3 package |
| **Microsoft Edge** | Supported — same Chromium package |
| **Brave** | Supported — load the Chrome/Chromium package |
| **Mozilla Firefox** | Planned / architecture-ready — **not runtime-validated** |

See [docs/BROWSER_COMPAT.md](docs/BROWSER_COMPAT.md) for packaging details and Firefox TODOs.

Build validation ≠ store publication ≠ runtime QA. Do not claim a browser was “tested successfully” until the ZIP/unpacked build has been loaded in that browser.

---

## Overview

MemShift turns useful insights from web browsing into a structured, interconnected, and instantly recallable personal knowledge graph.

```
CONSUME ──▶ CAPTURE ──▶ UNDERSTAND ──▶ CONNECT ──▶ REMEMBER ──▶ RECALL
 (Browser)   (Extension)   (Local+AI)    (Graph)    (Local/DB)    (Hybrid Search)
```

- **Browser Extension**: Capture + local understanding + local recall.
- **Supabase (optional sync)**: Connect + remember + semantic recall when backend sync is enabled.

Capture is **toggle-gated**. MemShift does **not** silently store every visited URL.

---

## Development

```bash
npm install
npm run generate-icons   # if icons are missing
npm run dev
```

### Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### Browser-specific builds

```bash
npm run build:chrome
npm run build:edge
npm run build:firefox   # structural package only; Firefox runtime not validated
```

Outputs land in `release/<target>/` with `manifest.json` version taken from `package.json`.

### Store packaging (ZIP)

```bash
npm run package:chrome
npm run package:edge
# npm run package:firefox   # only for architecture experiments until runtime-tested
```

Produces:

- `release/memshift-chrome-v1.0.0.zip`
- `release/memshift-edge-v1.0.0.zip`

Upload these ZIP files manually via the Chrome Web Store / Edge Add-ons developer dashboards. This repo does **not** automate store submission.

### Load unpacked (dev)

1. `npm run build` (or `npm run build:chrome`)
2. Open `chrome://extensions`, `edge://extensions`, or `brave://extensions`
3. Enable **Developer mode** → **Load unpacked** → select `dist/` or `release/chrome/`

---

## Permissions (privacy-first)

| Permission | Why it is required |
|---|---|
| `storage` | Settings, local memories, knowledge indexes, auth session, offline queue |
| Host access `http(s)://*/*` | Content scripts on public pages for **toggle-gated** capture |

**Not requested:** `history`, `bookmarks`, `cookies`, `tabs`, `webNavigation`, `management`, `downloads`.

Settings sync to open pages via `storage.onChanged` — no tab enumeration.

---

## Privacy model

- Master toggle OFF → no extraction, no capture, no sync.
- No browsing-history permission; MemShift is not a silent tracker.
- Forms, passwords, cookies, and website storage are never read.
- Sensitive fields (transcripts, tokens, keys) are redacted by the logger.
- Never put service-role keys or AI provider secrets in the extension (see `.env.example`).

---

## Project structure

```text
memshift-extension/
├── config/manifests/          # chrome.json, edge.json, firefox.json
├── scripts/                   # build-extension, package-extension, validate-release
├── release/                   # generated packages + ZIPs (gitignored)
├── public/manifest.json       # Chromium template used by Vite copy
├── src/
│   ├── background/            # MV3 service worker
│   ├── content/               # Capture content scripts
│   ├── popup/                 # React recall UI
│   ├── storage/               # Local memory + knowledge indexes
│   ├── knowledge/             # Classification / relationships
│   ├── shared/browser-api.ts  # chrome/browser API accessor
│   └── ...
├── docs/BROWSER_COMPAT.md
└── tests/
```

---

## Versioning

Extension version is defined once in `package.json` (`version`).
Release scripts inject that value into each browser `manifest.json`. Keep them in sync by never hard-coding a second version.

---

## Documentation

- [Browser compatibility](docs/BROWSER_COMPAT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Security](docs/SECURITY.md)
- [Chrome Web Store listing copy](CHROMEWEBSTORE.md)

---

## License

MIT License.
