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

## Private Beta Installation

```bash
npm run package
```

This creates `release/MemShift-Beta-v<version>.zip`. The ZIP contains only the compiled production extension under a `MemShift/` folder.

To install the temporary private beta before Chrome Web Store publication:

1. Download the beta ZIP.
2. Extract it.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click **Load unpacked**.
6. Select the extracted `MemShift/` folder containing `manifest.json`.

The extracted folder can also be loaded directly from `dist/` during development. This is a temporary beta installation method; MemShift has not been published to the Chrome Web Store.

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

MemShift Chrome Extension is licensed under the MIT License.

Copyright (c) 2026 Shreya Jha  

See the [LICENSE](LICENSE) file for the complete license.
