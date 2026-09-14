import { app } from 'electron'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  McpConfigFileSchema,
  type McpConfigFile,
  type McpServerConfigEntry
} from '@shared/types/mcpConfig'

/**
 * Loads MCP server connection settings (command/args or URL — never
 * credentials, which live with the MCP server process itself or its own
 * OAuth flow) from a local JSON file. This app never hardcodes ServiceNow
 * or Microsoft 365 credentials; it only points at MCP servers that are
 * already configured and authenticated outside the app.
 */

function defaultConfigPath(): string {
  return path.join(app.getPath('userData'), 'mcp-servers.json')
}

async function readJsonIfExists(filePath: string): Promise<unknown | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Best-effort discovery of an existing Claude Desktop MCP config, so users
 * who already have ServiceNow/Microsoft 365 MCP servers registered there
 * don't have to redefine them. Never throws; returns undefined if nothing
 * is found or the file can't be parsed. */
async function findClaudeDesktopConfig(): Promise<unknown | undefined> {
  const home = os.homedir()
  const candidates =
    process.platform === 'darwin'
      ? [path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')]
      : process.platform === 'win32'
        ? [path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')]
        : [path.join(home, '.config', 'Claude', 'claude_desktop_config.json')]

  for (const candidate of candidates) {
    const parsed = await readJsonIfExists(candidate)
    if (parsed) return parsed
  }
  return undefined
}

export interface McpConfigResult {
  servers: Record<string, McpServerConfigEntry>
  source: 'local' | 'claude-desktop' | 'none'
  configPath: string
}

export async function loadMcpConfig(overridePath?: string): Promise<McpConfigResult> {
  const configPath = overridePath ?? defaultConfigPath()

  const local = await readJsonIfExists(configPath)
  if (local) {
    const parsed = McpConfigFileSchema.safeParse(local)
    if (parsed.success) {
      return { servers: parsed.data.mcpServers, source: 'local', configPath }
    }
  }

  const desktop = await findClaudeDesktopConfig()
  if (desktop) {
    const parsed = McpConfigFileSchema.safeParse(desktop)
    if (parsed.success) {
      return { servers: parsed.data.mcpServers, source: 'claude-desktop', configPath }
    }
  }

  return { servers: {}, source: 'none', configPath }
}

export async function saveMcpConfig(config: McpConfigFile, overridePath?: string): Promise<string> {
  const configPath = overridePath ?? defaultConfigPath()
  const validated = McpConfigFileSchema.parse(config)
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(validated, null, 2), { mode: 0o600 })
  return configPath
}

export { defaultConfigPath }
