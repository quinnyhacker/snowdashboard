import { describe, expect, it } from 'vitest'
import {
  buildDeviceIndex,
  findDeviceExact,
  findDevicesContaining,
  findUserExact,
  findUsersContaining
} from '../lookupIndex'

const rows = [
  { Device: 'LAPTOP-001', User: 'jane.doe@kiewit.com' },
  { Device: 'LAPTOP-002', User: 'jane.doe@kiewit.com' },
  { Device: 'LAPTOP-003', User: 'john.smith@kiewit.com' },
  { Device: '', User: 'no.device@kiewit.com' },
  { Device: 'LAPTOP-004', User: '' }
]

describe('buildDeviceIndex', () => {
  const index = buildDeviceIndex(rows, 'Device', 'User')

  it('finds a device by exact, case-insensitive match', () => {
    expect(findDeviceExact(index, 'laptop-001')?.user).toBe('jane.doe@kiewit.com')
  })

  it('collects all devices for a user, de-duplicated', () => {
    const entry = findUserExact(index, 'JANE.DOE@KIEWIT.COM')
    expect(entry?.devices).toEqual(['LAPTOP-001', 'LAPTOP-002'])
  })

  it('ignores rows with a blank device or blank user for the respective index', () => {
    expect(findUserExact(index, 'no.device@kiewit.com')?.devices).toEqual([])
    expect(index.byDeviceLower.has('')).toBe(false)
  })

  it('finds devices/users by substring, case-insensitively', () => {
    expect(findDevicesContaining(index, '00').map((d) => d.device)).toEqual(
      expect.arrayContaining(['LAPTOP-001', 'LAPTOP-002', 'LAPTOP-003', 'LAPTOP-004'])
    )
    expect(findUsersContaining(index, 'SMITH')).toHaveLength(1)
  })

  it('returns nothing for an empty search term', () => {
    expect(findDevicesContaining(index, '')).toEqual([])
    expect(findUsersContaining(index, '  ')).toEqual([])
  })

  it('keeps the first row when the same device repeats', () => {
    const dupeRows = [
      { Device: 'LAPTOP-999', User: 'first.user@kiewit.com' },
      { Device: 'LAPTOP-999', User: 'second.user@kiewit.com' }
    ]
    const dupeIndex = buildDeviceIndex(dupeRows, 'Device', 'User')
    expect(findDeviceExact(dupeIndex, 'LAPTOP-999')?.user).toBe('first.user@kiewit.com')
  })
})
