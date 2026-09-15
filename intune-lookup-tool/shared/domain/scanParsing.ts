/**
 * When a technician scans the QR code on the back of a laptop, the
 * scanner acts like a keyboard and "types" the decoded URL wherever the
 * cursor is — it's the manufacturer's support-lookup link, not the
 * device name itself. This recognizes those URLs and pulls the service
 * tag back out, so a scan can be used directly as a lookup term instead
 * of requiring someone to open the link and copy the tag by hand.
 *
 * Each vendor's URL shape is confirmed against a real scanned example
 * before being added here — an unconfirmed guess would silently produce
 * a wrong device name, which is worse than not recognizing the scan at
 * all and falling back to treating it as a plain typed term.
 */

/** Prefix this org's device names use ahead of the raw service tag
 * (e.g. service tag "282QFH4" -> device name "A-282QFH4"). */
const DEVICE_NAME_PREFIX = 'A-'

interface VendorScanPattern {
  vendor: string
  matchesHost: (hostname: string) => boolean
  extractTag: (url: URL) => string | undefined
}

const VENDOR_SCAN_PATTERNS: VendorScanPattern[] = [
  {
    // Confirmed against a real scan: https://www.dell.com/support/pid?s=q3&t=282QFH4
    vendor: 'dell',
    matchesHost: (hostname) => /(^|\.)dell\.com$/i.test(hostname),
    extractTag: (url) => url.searchParams.get('t') ?? undefined
  }
]

/** Extracts the service tag/serial number from a scanned manufacturer
 * support URL, or undefined if the text isn't a recognized scan (in
 * which case callers should treat it as a plain typed term). */
export function extractServiceTagFromScan(raw: string): string | undefined {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return undefined
  }

  for (const pattern of VENDOR_SCAN_PATTERNS) {
    if (pattern.matchesHost(url.hostname)) {
      const tag = pattern.extractTag(url)
      if (tag && tag.trim().length > 0) return tag.trim().toUpperCase()
    }
  }

  return undefined
}

/** Converts a scanned URL directly into this org's device name
 * ("A-<tag>"), or undefined if the text isn't a recognized scan. */
export function deviceNameFromScan(raw: string): string | undefined {
  const tag = extractServiceTagFromScan(raw)
  return tag ? `${DEVICE_NAME_PREFIX}${tag}` : undefined
}

/** Convenience for lookup inputs: returns the recognized device name for
 * a scanned URL, or the trimmed input unchanged if it isn't one. */
export function normalizeScannedTerm(raw: string): string {
  return deviceNameFromScan(raw) ?? raw.trim()
}
