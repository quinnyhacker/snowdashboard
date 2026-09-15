import { describe, expect, it } from 'vitest'
import { deviceNameFromScan, extractServiceTagFromScan, normalizeScannedTerm } from '../scanParsing'

describe('extractServiceTagFromScan', () => {
  it('extracts the service tag from a real scanned Dell support URL', () => {
    expect(extractServiceTagFromScan('https://www.dell.com/support/pid?s=q3&t=282QFH4')).toBe('282QFH4')
  })

  it('is case-insensitive on the hostname and uppercases the extracted tag', () => {
    expect(extractServiceTagFromScan('https://WWW.DELL.COM/support/pid?t=abc1234')).toBe('ABC1234')
  })

  it('works without the www subdomain and regardless of other query params', () => {
    expect(extractServiceTagFromScan('https://dell.com/support/pid?t=XYZ9999&extra=1')).toBe('XYZ9999')
  })

  it('tolerates surrounding whitespace from the scan', () => {
    expect(extractServiceTagFromScan('  https://www.dell.com/support/pid?s=q3&t=282QFH4  \n')).toBe('282QFH4')
  })

  it('returns undefined for a dell.com URL with no tag param', () => {
    expect(extractServiceTagFromScan('https://www.dell.com/support/pid?s=q3')).toBeUndefined()
  })

  it('returns undefined for an unrecognized vendor URL', () => {
    expect(extractServiceTagFromScan('https://www.example.com/support?t=282QFH4')).toBeUndefined()
  })

  it('extracts the serial from a real scanned Lenovo QR URL, ignoring the machine type-model segment', () => {
    expect(extractServiceTagFromScan('https://uatesupport.lenovo.com/qrcode/PF5A2W5D/21G3S04W00')).toBe('PF5A2W5D')
  })

  it('recognizes Lenovo URLs regardless of subdomain', () => {
    expect(extractServiceTagFromScan('https://support.lenovo.com/qrcode/abc12345/21g3')).toBe('ABC12345')
  })

  it('returns undefined for a lenovo.com URL with nothing after /qrcode/', () => {
    expect(extractServiceTagFromScan('https://support.lenovo.com/qrcode/')).toBeUndefined()
    expect(extractServiceTagFromScan('https://support.lenovo.com/products/laptops')).toBeUndefined()
  })

  it('returns undefined for plain typed text that is not a URL', () => {
    expect(extractServiceTagFromScan('A-282QFH4')).toBeUndefined()
    expect(extractServiceTagFromScan('jane.doe')).toBeUndefined()
    expect(extractServiceTagFromScan('')).toBeUndefined()
  })
})

describe('deviceNameFromScan', () => {
  it('prepends the org device-name prefix to the extracted tag', () => {
    expect(deviceNameFromScan('https://www.dell.com/support/pid?s=q3&t=282QFH4')).toBe('A-282QFH4')
    expect(deviceNameFromScan('https://uatesupport.lenovo.com/qrcode/PF5A2W5D/21G3S04W00')).toBe('A-PF5A2W5D')
  })

  it('returns undefined when nothing was recognized', () => {
    expect(deviceNameFromScan('not a url')).toBeUndefined()
  })
})

describe('normalizeScannedTerm', () => {
  it('converts a recognized scan into the device name', () => {
    expect(normalizeScannedTerm('https://www.dell.com/support/pid?s=q3&t=282QFH4')).toBe('A-282QFH4')
  })

  it('passes a plain typed device name through unchanged (trimmed)', () => {
    expect(normalizeScannedTerm('  A-282QFH4  ')).toBe('A-282QFH4')
  })

  it('passes a plain username through unchanged', () => {
    expect(normalizeScannedTerm('jane.doe')).toBe('jane.doe')
  })
})
