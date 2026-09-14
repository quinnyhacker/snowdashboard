import { describe, expect, it } from 'vitest'
import { assessSla } from '../slaPolicy'

const NOW = new Date('2026-09-14T12:00:00Z')

describe('assessSla', () => {
  it('is ok with no due date', () => {
    const r = assessSla({ createdAt: '2026-09-13T12:00:00Z', state: 'New' }, NOW)
    expect(r.urgency).toBe('ok')
    expect(r.hoursRemaining).toBeUndefined()
    expect(r.ageHours).toBeCloseTo(24, 1)
  })

  it('is approaching when due within the window', () => {
    const r = assessSla(
      { createdAt: '2026-09-13T12:00:00Z', dueDate: '2026-09-15T06:00:00Z', state: 'In Progress' },
      NOW
    )
    expect(r.urgency).toBe('approaching')
    expect(r.hoursRemaining).toBeCloseTo(18, 1)
  })

  it('is breached when due date is in the past', () => {
    const r = assessSla(
      { createdAt: '2026-09-10T12:00:00Z', dueDate: '2026-09-14T00:00:00Z', state: 'In Progress' },
      NOW
    )
    expect(r.urgency).toBe('breached')
    expect(r.hoursRemaining).toBeLessThan(0)
  })

  it('is ok when comfortably before the due date', () => {
    const r = assessSla(
      { createdAt: '2026-09-13T12:00:00Z', dueDate: '2026-09-20T12:00:00Z', state: 'New' },
      NOW
    )
    expect(r.urgency).toBe('ok')
  })

  it('prefers slaDueDate over dueDate when both present', () => {
    const r = assessSla(
      {
        createdAt: '2026-09-13T12:00:00Z',
        dueDate: '2026-09-20T12:00:00Z',
        slaDueDate: '2026-09-15T00:00:00Z',
        state: 'New'
      },
      NOW
    )
    expect(r.urgency).toBe('approaching')
  })

  it('never flags urgency for closed/resolved/cancelled tickets even if past due', () => {
    for (const state of ['Resolved', 'Closed', 'Cancelled']) {
      const r = assessSla(
        { createdAt: '2026-09-10T12:00:00Z', dueDate: '2026-09-11T00:00:00Z', state },
        NOW
      )
      expect(r.urgency).toBe('ok')
    }
  })
})
