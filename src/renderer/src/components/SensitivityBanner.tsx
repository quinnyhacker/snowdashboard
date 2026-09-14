export function SensitivityBanner({ ticketNumber }: { ticketNumber: string }): JSX.Element {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Content withheld</p>
      <p>
        {ticketNumber} appears to carry a data sensitivity marking (CUI, export-controlled, Restricted, or
        similar). Its content is not displayed here — open it directly in ServiceNow, and contact Data
        Privacy if you have questions about handling it.
      </p>
    </div>
  )
}
