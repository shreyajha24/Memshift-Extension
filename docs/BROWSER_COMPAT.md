# Browser Compatibility

## Supported (Chromium family — shared package)

| Browser | Status | Package |
|---|---|---|
| Google Chrome | **Supported** (build validated; runtime must be tested manually) | `npm run package:chrome` → `release/memshift-chrome-vX.Y.Z.zip` |
| Microsoft Edge | **Supported** (same Chromium MV3 package; runtime must be tested manually) | `npm run package:edge` → `release/memshift-edge-vX.Y.Z.zip` |
| Brave | **Supported** (load the Chrome/Chromium package; runtime must be tested manually) | Use the Chrome ZIP / `release/chrome/` |

> Build validation is **not** the same as store publication or runtime QA.
> Do not claim “tested successfully” in a browser until a human has loaded the unpacked/ZIP build in that browser.

## Firefox — planned / architecture ready

| Browser | Status | Package |
|---|---|---|
| Mozilla Firefox | **Planned / not runtime-validated** | `npm run package:firefox` produces a structural package only |

### Firefox TODOs before claiming support

1. Load `release/firefox/` in Firefox Nightly/Release and verify MV3 background module loading.
2. Confirm `browser` vs `chrome` API resolution via `src/shared/browser-api.ts`.
3. Verify content-script IIFE injection and popup rendering.
4. Verify IndexedDB / `storage.local` persistence across restarts.
5. Submit to AMO only after those runtime checks pass.

The Firefox manifest lives at `config/manifests/firefox.json` and includes `browser_specific_settings.gecko`.

## Architecture

```text
ONE MemShift codebase (src/)
        ↓
Shared Vite build (dist/)
        ↓
config/manifests/{chrome|edge|firefox}.json  (+ version from package.json)
        ↓
release/{chrome|edge|firefox}/
        ↓
release/memshift-<target>-vX.Y.Z.zip
```

Chrome, Edge, and Brave share the Chromium implementation. Firefox uses the same built assets with a Firefox-specific manifest.

## Permissions (Chromium)

| Permission | Why |
|---|---|
| `storage` | Settings, local memories, knowledge indexes, auth session, offline sync queue |
| `host_permissions` `http(s)://*/*` | Content scripts run on public web pages for **toggle-gated** automatic capture |

**Not requested:** `history`, `bookmarks`, `cookies`, `tabs`, `webNavigation`, `management`, `downloads`, `alarms`.

Settings changes propagate through `storage.onChanged` (no tab enumeration).
