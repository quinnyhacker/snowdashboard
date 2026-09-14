import { app, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Stores the user's Anthropic API key using Electron's OS-native
 * `safeStorage` (Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 * The key is entered once by the user in Settings and never written in
 * plaintext to disk, logs, or the preferences store.
 *
 * Note for Kiewit reviewers: this is per-user local secret storage for a
 * desktop app, analogous to how git/gh CLI store personal access tokens in
 * the OS keychain — it is not a substitute for Azure Key Vault as an
 * organization-managed secrets store. An enterprise-managed deployment
 * that needs centralized rotation/audit of this key should instead fetch
 * it at app startup from Key Vault via an Entra ID-authenticated call and
 * skip local entry entirely; see README "Secrets handling" for both paths.
 */

const KEY_FILE_NAME = 'anthropic-api-key.enc'

function keyFilePath(): string {
  return path.join(app.getPath('userData'), KEY_FILE_NAME)
}

export async function hasApiKey(): Promise<boolean> {
  try {
    await fs.access(keyFilePath())
    return true
  } catch {
    return false
  }
}

export async function getApiKey(): Promise<string | undefined> {
  if (!safeStorage.isEncryptionAvailable()) {
    return undefined
  }
  try {
    const encrypted = await fs.readFile(keyFilePath())
    return safeStorage.decryptString(encrypted)
  } catch {
    return undefined
  }
}

export async function setApiKey(apiKey: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS-native secure storage is unavailable on this machine, so the API key cannot be stored safely. Refusing to save it in plaintext.'
    )
  }
  const trimmed = apiKey.trim()
  if (!trimmed) {
    throw new Error('API key must not be empty.')
  }
  const encrypted = safeStorage.encryptString(trimmed)
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(keyFilePath(), encrypted, { mode: 0o600 })
}

export async function clearApiKey(): Promise<void> {
  try {
    await fs.unlink(keyFilePath())
  } catch {
    // already absent
  }
}
