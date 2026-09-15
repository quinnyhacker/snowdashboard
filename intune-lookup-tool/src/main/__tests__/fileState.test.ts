import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// fileState.ts touches ./config for column-choice persistence, which in
// turn touches Electron's `app` — not available under vitest. The
// auto-sync logic under test here (pollForChanges) never reads or writes
// config itself, so a no-op mock is enough to let the module load.
vi.mock('../config', () => ({
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined)
}))

describe('pollForChanges', () => {
  let tmpDir: string
  let filePath: string

  beforeEach(async () => {
    vi.resetModules()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ilt-test-'))
    filePath = path.join(tmpDir, 'devices.csv')
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('establishes a baseline on the first poll without reporting a change', async () => {
    await fs.writeFile(filePath, 'Device,User\nLAPTOP-1,jane.doe@kiewit.com\n')
    const { importDevice, confirmDeviceColumns, pollForChanges } = await import('../fileState')
    await importDevice(filePath)
    await confirmDeviceColumns('Device', 'User')

    expect(await pollForChanges()).toEqual([])
  })

  it('does not report anything when the file is untouched', async () => {
    await fs.writeFile(filePath, 'Device,User\nLAPTOP-1,jane.doe@kiewit.com\n')
    const { importDevice, confirmDeviceColumns, pollForChanges } = await import('../fileState')
    await importDevice(filePath)
    await confirmDeviceColumns('Device', 'User')
    await pollForChanges()

    expect(await pollForChanges()).toEqual([])
  })

  it('re-parses and reports a section whose file changed on disk, updating the live search index', async () => {
    await fs.writeFile(filePath, 'Device,User\nLAPTOP-1,jane.doe@kiewit.com\n')
    const { importDevice, confirmDeviceColumns, pollForChanges, runSearchNow } = await import('../fileState')
    await importDevice(filePath)
    await confirmDeviceColumns('Device', 'User')
    await pollForChanges() // baseline

    await fs.writeFile(filePath, 'Device,User\nLAPTOP-1,jane.doe@kiewit.com\nLAPTOP-2,john.smith@kiewit.com\n')
    const future = new Date(Date.now() + 5000)
    await fs.utimes(filePath, future, future)

    const updates = await pollForChanges()
    expect(updates).toEqual([{ kind: 'device', summary: { status: 'loaded', fileName: 'devices.csv', count: 2 } }])

    expect(runSearchNow('device', 'LAPTOP-2').kind).toBe('exact')
  })

  it('reports nothing when no sections are loaded yet', async () => {
    const { pollForChanges } = await import('../fileState')
    expect(await pollForChanges()).toEqual([])
  })
})
