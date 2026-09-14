import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LegacyConfig } from '@shared/types/config'

/**
 * Reads/writes %APPDATA%\IntuneLookupTool\config.json using the exact same
 * PascalCase keys as the original PowerShell tool, so a config file
 * carries over in either direction between the two versions. main/index.ts
 * points app.getPath('userData') at ...\IntuneLookupTool before the app is
 * ready, so this resolves to the identical path.
 */
function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export async function loadConfig(): Promise<LegacyConfig> {
  try {
    const raw = await fs.readFile(configPath(), 'utf-8')
    return JSON.parse(raw) as LegacyConfig
  } catch {
    return {}
  }
}

export async function saveConfig(updates: Partial<LegacyConfig>): Promise<void> {
  const existing = await loadConfig()
  const merged: LegacyConfig = { ...existing, ...updates }
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(configPath(), JSON.stringify(merged, null, 2))
}
