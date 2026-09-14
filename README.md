# ServiceNow Command Center

A desktop app (Electron + React) that shows a live dashboard of your ServiceNow work items and
docks a persistent Claude-powered chat panel next to it, so you can review, update, and act on
tickets — and draft related emails — without leaving the app.

## Architecture

```
shared/                 Pure domain logic + types shared by main and renderer
  domain/
    ticket.ts           Ticket domain model
    slaPolicy.ts         SLA/age assessment + color tokens (unit tested)
    sensitivity.ts        CUI / data-sensitivity marker detection (unit tested)
    actionPolicy.ts        Routine vs. high-impact field-change classification (unit tested)
    ticketView.ts         Filtering/sorting for the dashboard (unit tested)
  types/                 Preferences, chat, MCP config, email shapes
  ipc/                    IPC channel names + the typed window.api contract

src/main/               Electron main process (Node)
  index.ts               App bootstrap, window creation, IPC handlers
  agent/
    chatEngine.ts          Embeds the Claude Agent SDK; streams chat, gates tool calls
    toolGate.ts             Maps an MCP tool call's input to the action policy decision
  mcp/
    config.ts               Loads MCP server connection settings from local JSON
    mcpClientManager.ts       Direct MCP client for read-only dashboard polling
    serviceNowTools.ts        get_my_work / get_my_opened_tickets / get_my_groups_work / find_task
    m365Tools.ts               Read-only Outlook lookups (email search)
    normalize.ts               Raw MCP JSON -> Ticket domain objects + sensitivity flag
  settings/
    secureKeyStore.ts          OS-keychain-backed Anthropic API key storage
    preferencesStore.ts         View preferences only (never ticket content)
  notifications/notifier.ts   Desktop notifications for new assignments / SLA-approaching

src/preload/index.ts    contextBridge surface exposed to the renderer as window.api

src/renderer/           React UI (Vite)
  src/components/          Dashboard, TicketCard, TicketDetail, ChatPanel, ConfirmationModal,
                            SettingsView, DailySummary, ActivityToast, AppShell
  src/state/store.ts        zustand store for renderer state
  src/hooks/useAppInit.ts    Wires IPC events + auto-refresh on mount
```

## How the pieces fit together

- **Dashboard reads are direct MCP calls**, not agent turns: `mcpClientManager` connects straight
  to the ServiceNow/Microsoft 365 MCP servers to fetch tickets, so a 5-minute auto-refresh doesn't
  burn LLM tokens or add latency.
- **Chat-driven actions go through the Claude Agent SDK** (`src/main/agent/chatEngine.ts`), which
  gets its own MCP server connections via the SDK's `mcpServers` option and has no built-in
  Claude Code tools enabled (`tools: []`) — it can only call the ServiceNow/Outlook MCP tools you've
  configured, nothing else (no shell, no filesystem).
- **Confirmation gating** happens in the SDK's `canUseTool` callback (`toolGate.ts` +
  `shared/domain/actionPolicy.ts`): routine changes (work notes, comments, non-terminal state
  moves, standard field edits) are applied automatically; reassignment, priority changes, closing
  a ticket, and sending an email always pause for your explicit approval in the UI. Any field the
  policy doesn't recognize fails safe to "needs confirmation" rather than silently applying.
- **Email is draft-only from chat.** `outlook_create_draft`/`outlook_create_reply_draft` etc. are
  auto-allowed since they only create a draft for you to review; `outlook_send_mail`/
  `outlook_send_draft` always require confirmation.

## Setup

1. `npm install`
2. Configure MCP connections: open **Settings** in the app (or edit the JSON directly) and point it
   at your already-configured ServiceNow and Microsoft 365 MCP servers — the app never stores
   credentials itself. On first run it will also try to detect an existing Claude Desktop
   `claude_desktop_config.json` and offer to reuse its `mcpServers` entries.
3. Add your Anthropic API key in **Settings**. It's encrypted with Electron's `safeStorage` (OS
   Keychain / DPAPI / libsecret) and never written to disk in plaintext.
4. `npm run dev` to launch in development, or `npm run build && npm run package` to produce a
   distributable build via electron-builder.

## Testing

- `npm test` — Vitest unit tests for the domain/policy logic (SLA coloring, sensitivity
  detection, routine-vs-high-impact classification, filter/sort) and React Testing Library
  component tests (TicketCard, ConfirmationModal, Dashboard) against mock ticket data.
- `npm run typecheck` — strict TypeScript across main, preload, renderer, and shared.
- `npm run lint` — ESLint.
- `npm run build` — production build of all three Electron targets.

This project was built and verified in a headless CI-style environment (build + typecheck + unit/
component tests only, per the target audience's own choice) — it has **not** been click-tested in
a real desktop window. Do a manual pass (`npm run dev`) before relying on it day-to-day, especially
around the confirmation modal and MCP connection handling.

## Security / data-handling notes (Kiewit)

- **Secrets:** No ServiceNow or Microsoft 365 credentials are ever entered into or stored by this
  app — it only points at MCP servers that are already authenticated outside of it. The one secret
  the app itself holds is your personal Anthropic API key, stored via OS-native secure storage
  (`safeStorage`), analogous to how `git`/`gh` store personal access tokens locally. This is **not**
  Azure Key Vault. For a centrally-managed deployment, replace `secureKeyStore.ts` with a startup
  call to Key Vault via an Entra ID-authenticated flow instead of local entry.
- **Least privilege:** The embedded agent has `tools: []` (all built-in Claude Code tools disabled)
  and only the MCP tools you explicitly configure — no shell or filesystem access from chat.
- **Data classification:** Ticket/email content is treated as at least Internal/Confidential.
  `shared/domain/sensitivity.ts` heuristically flags CUI/ITAR/export-controlled/Restricted/FOUO
  markings on a ticket's classification field or free text; flagged tickets show a "content
  withheld" banner instead of the raw text, in the dashboard, detail view, and the system prompt
  instructs the chat model not to restate flagged content either. This is defense-in-depth on top
  of — not a replacement for — the source system's own classification field, and can have false
  negatives for unconventional markings.
- **No raw data persistence:** `preferencesStore.ts` persists only view preferences (filters, sort,
  layout) between sessions. Ticket content, chat transcripts, and email content live in memory for
  the running session only and are never written to disk by this app.
- **CI enforcement:** intended to run behind CodeQL, Dependabot, and Secret Scanning per Kiewit's
  GitHub configuration; nothing here is a substitute for those checks.
