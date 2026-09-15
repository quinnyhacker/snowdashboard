# Device / User Lookup Tool

A desktop rewrite of the original PowerShell/WinForms device-user lookup script, as an Electron +
React app with a slicker UI. Same behavior, same config file, better look and feel.

Look up a username to find their device(s), or a device name to find its assigned user. Cross-
references against a legal hold list and a home/work district list, if loaded, and flags/labels
results accordingly. Everything is local — CSV files in, a config file in `%APPDATA%`, nothing else.

## Bulk lookup

Built for hardware recovery: a batch of recovered laptops comes in and each one needs its district
looked up so the depot can sort it into the right redeployment stockpile.

Switch to **Bulk lookup**, paste or type one device name (or username) per line, and click **Look
up all**. Each line comes back as its own row — device/user, district, and legal hold status —
so you can see at a glance which pile each recovered laptop belongs in. Legal hold rows are
highlighted so nothing on hold gets redeployed by mistake. Anything that didn't match exactly shows
up in a "not found" list you can click to re-check with the (typo-tolerant) single lookup. **Copy
all results** exports the full batch as tab-separated text, ready to paste into Excel as a record of
what went where.

Bulk lookup only does exact matching per line — with dozens of laptops at once, silently guessing
among partial matches would be worse than just flagging a line as not found.

### Live scan mode

A handheld scanner sends an Enter keystroke after each decode, so you don't have to click **Look up
all** at the end of a batch — just leave the cursor in the bulk textarea and keep scanning laptops
back-to-back. Each time Enter completes a line, that one entry is looked up immediately and appended
to the results below, while the rest of the box (if you were also mid-typing something above it) is
left alone. A **Last scanned** banner up top always shows the most recent scan full-size, with its
district and a loud legal-hold warning if it's on hold, so a tech glancing up doesn't have to hunt
through the results table.

Pasting or typing a whole list and clicking **Look up all** still works the same as before, and adds
to the same running results list rather than replacing it — so scanning a few, pasting a few more,
and scanning some more all accumulate together. Use **Clear results** to start a fresh batch.

### Saving a CSV

**Save CSV** writes the full batch — including anything not found — to a CSV file you choose on
disk, as a permanent record of the recovery run. This is separate from **Copy all results**, which
just puts the same data on the clipboard for a quick paste and doesn't leave a file behind.

### Scanning QR codes instead of typing

The QR code printed on the back of a laptop is a link to the manufacturer's support site, not the
device name itself — but a handheld scanner just "types" that decoded link wherever the cursor is,
the same way a barcode scanner does. Point the cursor at the search box (single lookup) or the bulk
textarea and scan directly: the app recognizes the manufacturer's URL, pulls the service tag back
out of it, and looks up `A-<tag>` (this org's device naming convention) automatically instead of
searching for the raw URL.

Currently recognized: **Dell** (`dell.com/support/pid?...&t=<tag>` links) and **Lenovo**
(`lenovo.com/qrcode/<serial>/<machine-type-model>` links). HP isn't wired up yet — each vendor
formats this URL differently, and getting it wrong would silently produce the wrong device name,
which is worse than not supporting it. Recognition logic lives in `shared/domain/scanParsing.ts`;
extending it to another vendor just needs one real example of that vendor's decoded QR link to
confirm the URL shape before adding it.


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
