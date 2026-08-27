# Build audit: automatic capture architecture

## Previous service worker error and root cause

The failing generated worker contained a top-level `chrome.alarms.onAlarm` registration for a recurring sync alarm. In a build where `alarms` was not available, evaluating that expression threw `Cannot read properties of undefined (reading 'onAlarm')`. The uncaught top-level exception prevented MV3 worker registration and surfaced as status code 15.

## Fix

The alarm-based implementation has been removed rather than permissioned. Repository searches cover `chrome.alarms`, `alarms.onAlarm`, `chrome.alarms.create`, `chrome.alarms.clear`, and `onAlarm`; source and generated output are expected to contain none after build. Offline sync remains local-first and is retried manually from the popup or on a later capture event.

The worker is now only event-driven: install/startup, runtime messages, storage changes, settings notifications, and badge updates. Browsing capture is performed only by the toggle-gated content script.

## Intentional permissions

- `storage`: settings, local captures, auth state, knowledge indexes, and sync queue.
- `http://*/*` and `https://*/*` host access: toggle-gated automatic capture on public sites via content scripts.

There are no `tabs`, `alarms`, history, or network-interception/blocking permissions. Settings propagate through `storage.onChanged`.

## Verification

Completed on 2026-08-26: `npm install`, `npm run typecheck`, and `npm run lint` passed; `npm test` passed 9 files / 39 tests; `npm run build` completed successfully. The generated `dist/` was searched and contains no alarm or manual-capture handler references. Runtime browser validation still must be performed manually in Chrome; it is not represented by this source audit.
