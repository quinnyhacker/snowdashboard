import type { SectionKind } from '@renderer/state/store'

export interface ColumnField {
  key: string
  label: string
}

export const COLUMN_FIELDS: Record<SectionKind, ColumnField[]> = {
  device: [
    { key: 'deviceCol', label: 'Which column has the device name?' },
    { key: 'userCol', label: 'Which column has the user?' }
  ],
  legalHold: [
    { key: 'firstCol', label: 'Which column has the FIRST name?' },
    { key: 'lastCol', label: 'Which column has the LAST name?' }
  ],
  district: [
    { key: 'firstCol', label: 'Which column has the FIRST name?' },
    { key: 'lastCol', label: 'Which column has the LAST name?' },
    { key: 'workCol', label: 'Which column has the WORK DISTRICT?' },
    { key: 'homeCol', label: 'Which column has the HOME DISTRICT?' }
  ]
}

export const SECTION_TITLES: Record<SectionKind, string> = {
  device: 'Device Export',
  legalHold: 'Legal Hold List',
  district: 'District List'
}
