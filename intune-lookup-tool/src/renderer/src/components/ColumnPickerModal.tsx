import { useEffect, useState } from 'react'
import { useAppStore } from '@renderer/state/store'
import { COLUMN_FIELDS, SECTION_TITLES } from '@renderer/lib/columnFields'
import { confirmColumnsForSection } from '@renderer/lib/sectionActions'

export function ColumnPickerModal(): JSX.Element | null {
  const columnPicker = useAppStore((s) => s.columnPicker)
  const closeColumnPicker = useAppStore((s) => s.closeColumnPicker)
  const setSection = useAppStore((s) => s.setSection)
  const showToast = useAppStore((s) => s.showToast)

  const [selections, setSelections] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!columnPicker) return
    const fields = COLUMN_FIELDS[columnPicker.kind]
    setSelections(
      Object.fromEntries(fields.map((f) => [f.key, columnPicker.guesses[f.key] ?? ''])) as Record<string, string>
    )
  }, [columnPicker])

  if (!columnPicker) return null

  const fields = COLUMN_FIELDS[columnPicker.kind]
  const allChosen = fields.every((f) => selections[f.key])

  const handleSave = async (): Promise<void> => {
    const summary = await confirmColumnsForSection(columnPicker.kind, selections)
    setSection(columnPicker.kind, summary)
    closeColumnPicker()
    if (summary.status === 'loaded') {
      showToast(`${SECTION_TITLES[columnPicker.kind]}: ${summary.count?.toLocaleString()} loaded`, 'success')
    } else if (summary.status === 'error') {
      showToast(summary.message ?? 'Something went wrong.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-black">Confirm columns — {SECTION_TITLES[columnPicker.kind]}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          These choices are remembered, so you only need to do this once per file layout.
        </p>

        <div className="mt-4 space-y-4">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-sm font-medium text-black">{field.label}</span>
              <select
                value={selections[field.key] ?? ''}
                onChange={(e) => setSelections((s) => ({ ...s, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-kiewit-gold focus:outline-none focus:ring-1 focus:ring-kiewit-gold"
              >
                <option value="" disabled>
                  Select a column…
                </option>
                {columnPicker.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeColumnPicker}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-black hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChosen}
            onClick={handleSave}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            Save and continue
          </button>
        </div>
      </div>
    </div>
  )
}
