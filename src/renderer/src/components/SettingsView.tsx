import { useEffect, useState } from 'react'
import type { SettingsStatus } from '@shared/ipc/api'

export function SettingsView(): JSX.Element {
  const [status, setStatus] = useState<SettingsStatus | undefined>()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [mcpConfigText, setMcpConfigText] = useState('')
  const [message, setMessage] = useState<string | undefined>()

  const refreshStatus = (): void => {
    window.api.settings.getStatus().then(setStatus)
  }

  useEffect(() => {
    refreshStatus()
    window.api.settings.getMcpConfigRaw().then(setMcpConfigText)
  }, [])

  const saveApiKey = async (): Promise<void> => {
    if (!apiKeyInput.trim()) return
    await window.api.settings.setApiKey(apiKeyInput.trim())
    setApiKeyInput('')
    setMessage('API key saved to OS secure storage.')
    refreshStatus()
  }

  const clearApiKey = async (): Promise<void> => {
    await window.api.settings.clearApiKey()
    setMessage('API key cleared.')
    refreshStatus()
  }

  const saveMcpConfig = async (): Promise<void> => {
    try {
      const parsed = JSON.parse(mcpConfigText)
      const result = await window.api.settings.saveMcpConfig(parsed)
      setMessage(`MCP configuration saved to ${result.configPath}.`)
      refreshStatus()
    } catch (error) {
      setMessage(`Couldn't save: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 overflow-y-auto p-6">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Anthropic API key</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stored using your OS&rsquo;s native secure storage (Keychain / DPAPI / libsecret). Never written in
          plaintext to disk or logs. This is a personal credential for this desktop app, not an
          organization-managed secret — Kiewit-deployed builds should instead fetch it from Azure Key
          Vault at startup.
        </p>
        <p className="mt-2 text-sm">
          Status:{' '}
          <span className={status?.hasApiKey ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
            {status?.hasApiKey ? 'Configured' : 'Not configured'}
          </span>
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button type="button" onClick={saveApiKey} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
            Save
          </button>
          {status?.hasApiKey && (
            <button type="button" onClick={clearApiKey} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Clear
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">MCP connections</h2>
        <p className="mt-1 text-sm text-slate-500">
          Point this app at your already-configured ServiceNow and Microsoft 365 MCP servers. No
          credentials are entered here — the servers themselves handle their own authentication.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Source: <span className="font-medium">{status?.mcpSource ?? '…'}</span> · Configured servers:{' '}
          <span className="font-medium">{status?.configuredServers.join(', ') || 'none'}</span>
        </p>
        <textarea
          value={mcpConfigText}
          onChange={(e) => setMcpConfigText(e.target.value)}
          rows={10}
          spellCheck={false}
          className="mt-2 w-full rounded border border-slate-300 p-2 font-mono text-xs"
        />
        <button type="button" onClick={saveMcpConfig} className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
          Save MCP config
        </button>
      </section>

      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  )
}
