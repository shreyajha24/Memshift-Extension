# Browser Compatibility

## Current Release Target

| Browser | Status | Package |
|---|---|---|
| Google Chrome | Supported MV3 production build | `npm run package:chrome` -> `memshift-chrome.zip` |

The current store release is Chrome-only. The build and packaging scripts intentionally do not create Edge, Firefox, Brave, or cross-browser release packages.

## Build Flow

```text
public/manifest.json  (canonical Chrome MV3 source)
        |
        v
npm run build
        |
        v
dist/                 (Chrome extension root)
        |
        v
npm run package:chrome
        |
        v
memshift-chrome.zip   (contents of dist at archive root)
```

`dist/` is the folder to load unpacked in Chrome. The Chrome Web Store ZIP must contain `manifest.json` at the archive root and must not contain nested `dist/`, `public/`, `release/`, browser-specific folders, or duplicate manifests.

## Runtime QA

Build validation is not the same as runtime QA. Before submission, load `dist/` in Chrome and test:

1. Extension install.
2. Popup open.
3. Background service worker load.
4. Content script load.
5. Page extraction and capture.
6. API communication.
7. Supabase auth/data flow where applicable.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Settings, local memories, knowledge indexes, auth session, offline sync queue |
| `host_permissions` `http(s)://*/*` | Content scripts run on public web pages for toggle-gated automatic capture |

Not requested: `history`, `bookmarks`, `cookies`, `tabs`, `webNavigation`, `management`, `downloads`, `alarms`.
