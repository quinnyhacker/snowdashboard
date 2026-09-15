# Device / User Lookup Tool

A desktop rewrite of the original PowerShell/WinForms device-user lookup script, as an Electron +
React app with a slicker UI. Same behavior, same config file, better look and feel.

Look up a username to find their device(s), or a device name to find its assigned user. Cross-
references against a legal hold list and a home/work district list, if loaded, and flags/labels
results accordingly. Everything is local — CSV files in, a config file in `%APPDATA%`, nothing else.

## Using a shared file for a team

Everyone on a team can point the app at the *same* CSV files on a shared network drive instead of
their own local copies, so there's one source of truth:

1. Put the exported device CSV (and legal hold / district lists, if used) on a shared network path
   everyone can reach.
2. Each teammate, the first time, uses **Load export...** and browses to that shared path instead
   of a local file. The app remembers that exact path (in their own local
   `%APPDATA%\IntuneLookupTool\config.json`) and auto-loads from it on every future launch.
3. Whoever produces the export just re-exports and overwrites the same file at that path
   periodically (same filename, so everyone's remembered path keeps working).
4. Everyone else automatically picks up the update within about 2 minutes (the app checks the
   file's modification time in the background) — no restart, no manual click, no re-browsing.
   There's also a **Refresh** button next to a loaded section for "check right now." If the column
   layout ever changes, either path will prompt to re-confirm columns instead of silently breaking.

This needs no new infrastructure — just a network share your team already has access to. There's
no live/automatic sync from Intune itself; someone still has to periodically re-export and drop the
file in place — "uploading" here just means overwriting that shared file. Automating the export
itself via Microsoft Graph, so nobody has to do it by hand, is a bigger follow-on step (needs an
Entra ID app registration with read-only device/user permissions).

## What changed from the PowerShell version

- **UI**: black/gold (Kiewit brand) sidebar with animated collapsible sections, toast notifications
  instead of `MessageBox` popups, card-based results with legal hold banners and district badges,
  a copy-to-clipboard button on exact matches.
- **Same config file.** `%APPDATA%\IntuneLookupTool\config.json` uses the exact same keys
  (`DeviceCol`, `UserCol`, `LastFolder`, `LastFile`, `LegalHoldFile`, `LegalHoldFirstCol`, `LegalHoldLastCol`,
  `DistrictFile`, `DistrictFirstCol`, `DistrictLastCol`, `DistrictWorkCol`, `DistrictHomeCol`, plus a
  new `AlwaysOnTop`), so a config saved by either version works with the other.
- **Same matching logic**, ported line-for-line and unit tested: column guessing
  (`Find-BestColumn`), name parsing from `first.last@domain` style usernames
  (`Get-NameParts`/`Normalize-NamePart`/`Get-NameKey`), the device/user index, and the legal
  hold/district merge behavior.
- **One correctness fix**: if more than one loaded file needs its columns re-confirmed on the same
  startup (e.g. two file layouts both changed since last run), the column-picker dialogs are now
  queued and shown one at a time instead of only the last one appearing.

## Project layout

```
shared/
  types/            Config file shape (legacy-compatible), IPC payload types
  domain/           Pure, unit-tested logic: name matching, column guessing, device/user
                     index, legal hold, district, and the overall search function
  ipc/              IPC channel names + the typed window.api contract

src/main/
  index.ts          App bootstrap; points userData at %APPDATA%\IntuneLookupTool; IPC handlers
  config.ts         Read/write config.json
  csv.ts            CSV parsing (papaparse)
  fileState.ts      In-memory state for the three loaded files + the column-picker flow

src/preload/index.ts   contextBridge surface exposed to the renderer as window.api

src/renderer/src/
  components/       Sidebar, CollapsibleSection, ColumnPickerModal, SearchPanel, ResultView, Toast
  state/store.ts    zustand store (section state, search state, column-picker queue, toasts)
```

## Setup

```
npm install
npm run dev
```

No API keys, no external services, no network calls — this only touches local CSV files and its
own config file.

## Testing

- `npm test` — Vitest: pure domain/policy logic (name matching, column guessing, index building,
  legal hold, district, search) plus React component tests (ResultView rendering, the column-picker
  queueing behavior).
- `npm run typecheck` / `npm run lint` — strict TypeScript + ESLint.
- `npm run build` — production build of all three Electron targets.
- `npm run package` — produces an installable build via electron-builder (`release/`).

Built and verified headless (build + typecheck + unit/component tests) — do a `npm run dev` pass
locally to click through the actual UI, especially the column-picker flow with a real CSV export.

## Data handling

Nothing is sent anywhere. CSV files are read once into memory for the running session and are
never written back to disk by this app; only the column choices and file *paths* (not their
contents) are persisted, in the config file described above.
