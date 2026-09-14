import { assessSla, SLA_COLOR_TOKENS } from '@shared/domain/slaPolicy'
import type { Ticket } from '@shared/domain/ticket'

function formatHours(hours: number): string {
  const abs = Math.abs(hours)
  if (abs < 1) return `${Math.round(abs * 60)}m`
  if (abs < 48) return `${Math.round(abs)}h`
  return `${Math.round(abs / 24)}d`
}

export function SlaBadge({ ticket }: { ticket: Ticket }): JSX.Element {
  const assessment = assessSla(ticket)
  const tokens = SLA_COLOR_TOKENS[assessment.urgency]

  let label = tokens.label
  if (assessment.hoursRemaining !== undefined) {
    label =
      assessment.hoursRemaining < 0
        ? `${formatHours(assessment.hoursRemaining)} past due`
        : `Due in ${formatHours(assessment.hoursRemaining)}`
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tokens.bg} ${tokens.text} ${tokens.border}`}
      title={`Age: ${formatHours(assessment.ageHours)}`}
    >
      {label}
    </span>
  )
}
