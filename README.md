# MemShift - Your Internet Memory

> Privacy-first personal memory layer for the internet.
> Current release target: Google Chrome / Chrome Web Store.

## Supported Browser For This Release

| Browser | Status |
|---|---|
| Google Chrome | Supported MV3 production build |

Build validation is not the same as store publication or runtime QA. Do not claim the extension was tested successfully until the unpacked `dist/` build has been loaded in Chrome and exercised.

## Overview

MemShift turns useful insights from web browsing into a structured, interconnected, and instantly recallable personal knowledge graph.

```text
CONSUME -> CAPTURE -> UNDERSTAND -> CONNECT -> REMEMBER -> RECALL
 (Browser) (Extension) (Local+AI)   (Graph)   (Local/DB) (Hybrid Search)
```

- Browser extension: capture, local understanding, and local recall.
- Supabase optional sync: connect, remember, and semantic recall when backend sync is enabled.

Capture is toggle-gated. MemShift does not silently store every visited URL.

## Development

```bash
npm install
npm run generate-icons   # if icons are missing
npm run dev
```

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run validate:chrome
```

## Chrome Production Build

```bash
npm run build
```

The canonical source manifest is `public/manifest.json`. Vite copies it to `dist/manifest.json`; the secondary content build then writes the classic IIFE `content.js` into the same `dist/` folder without emptying it.

After build, `dist/` is the Chrome extension root to load unpacked.

## Chrome Web Store ZIP

```bash
npm run package:chrome
```

This creates `memshift-chrome.zip` from the contents of `dist/`. The archive root contains `manifest.json`; it does not contain a nested project folder, `dist/`, `public/`, or `release/`.

## Load Unpacked In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `dist/`.

## Permissions

| Permission | Why it is required |
|---|---|
| `storage` | Settings, local memories, knowledge indexes, auth session, offline queue |
| Host access `http(s)://*/*` | Content scripts on public pages for toggle-gated capture |

Not requested: `history`, `bookmarks`, `cookies`, `tabs`, `webNavigation`, `management`, `downloads`.

Settings sync to open pages via `storage.onChanged`; no tab enumeration is required.

## Privacy Model

- Master toggle OFF means no extraction, no capture, and no sync.
- No browsing-history permission; MemShift is not a silent tracker.
- Forms, passwords, cookies, and website storage are never read.
- Sensitive fields such as transcripts, tokens, and keys are redacted by the logger.
- Never put service-role keys or AI provider secrets in the extension. See `.env.example`.

## Project Structure

```text
memshift-extension/
|-- dist/                         # generated Chrome extension root (gitignored)
|-- public/manifest.json          # canonical Chrome MV3 manifest
|-- public/icons/                 # extension icons copied into dist/icons
|-- scripts/
|   |-- package-extension.mjs     # builds, validates, and zips dist contents
|   |-- release-lib.mjs           # ZIP and validation helpers
|   `-- validate-chrome-build.mjs # validates dist as a Chrome extension
|-- src/
|   |-- background/               # MV3 service worker
|   |-- content/                  # capture content scripts
|   |-- popup/                    # React recall UI
|   |-- storage/                  # local memory and knowledge indexes
|   |-- knowledge/                # classification and relationships
|   `-- shared/browser-api.ts     # extension API accessor
|-- docs/
`-- tests/
```

## Versioning

Keep `package.json` and `public/manifest.json` versions aligned. `npm run validate:chrome` fails if they diverge.

## Documentation

- [Browser compatibility](docs/BROWSER_COMPAT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Security](docs/SECURITY.md)
- [Chrome Web Store listing copy](CHROMEWEBSTORE.md)

## License

MIT License.
