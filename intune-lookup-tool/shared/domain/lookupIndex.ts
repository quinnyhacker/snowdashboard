export type CsvRow = Record<string, string>

export interface DeviceEntry {
  /** Original-cased device name as it appeared in the CSV. */
  device: string
  user: string
}

export interface UserEntry {
  /** Original-cased user string as it appeared in the CSV. */
  user: string
  devices: string[]
}

export interface DeviceIndex {
  byDeviceLower: Map<string, DeviceEntry>
  byUserLower: Map<string, UserEntry>
}

/** Builds the device<->user cross-reference from the device export rows.
 * Ported from Build-Index: for a given device, the first row wins if the
 * same device appears more than once; a user's device list de-duplicates
 * (a minor improvement over the original, which could repeat an entry). */
export function buildDeviceIndex(rows: CsvRow[], deviceCol: string, userCol: string): DeviceIndex {
  const byDeviceLower = new Map<string, DeviceEntry>()
  const byUserLower = new Map<string, UserEntry>()

  for (const row of rows) {
    const device = (row[deviceCol] ?? '').trim()
    const user = (row[userCol] ?? '').trim()

    if (device) {
      const key = device.toLowerCase()
      if (!byDeviceLower.has(key)) {
        byDeviceLower.set(key, { device, user })
      }
    }

    if (user) {
      const key = user.toLowerCase()
      const existing = byUserLower.get(key)
      if (!existing) {
        byUserLower.set(key, { user, devices: device ? [device] : [] })
      } else if (device && !existing.devices.some((d) => d.toLowerCase() === device.toLowerCase())) {
        existing.devices.push(device)
      }
    }
  }

  return { byDeviceLower, byUserLower }
}

export function findDeviceExact(index: DeviceIndex, term: string): DeviceEntry | undefined {
  return index.byDeviceLower.get(term.trim().toLowerCase())
}

export function findUserExact(index: DeviceIndex, term: string): UserEntry | undefined {
  return index.byUserLower.get(term.trim().toLowerCase())
}

export function findDevicesContaining(index: DeviceIndex, term: string): DeviceEntry[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return []
  return Array.from(index.byDeviceLower.values()).filter((entry) => entry.device.toLowerCase().includes(needle))
}

export function findUsersContaining(index: DeviceIndex, term: string): UserEntry[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return []
  return Array.from(index.byUserLower.values()).filter((entry) => entry.user.toLowerCase().includes(needle))
}
