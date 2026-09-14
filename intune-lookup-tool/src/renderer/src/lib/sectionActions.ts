import type { SectionSummary } from '@shared/types/sections'
import type { SectionKind } from '@renderer/state/store'

export async function browseSection(kind: SectionKind): Promise<SectionSummary | undefined> {
  if (kind === 'device') return window.api.device.browse()
  if (kind === 'legalHold') return window.api.legalHold.browse()
  return window.api.district.browse()
}

export async function changeColumnsForSection(kind: SectionKind): Promise<SectionSummary | undefined> {
  if (kind === 'device') return window.api.device.changeColumns()
  if (kind === 'legalHold') return window.api.legalHold.changeColumns()
  return window.api.district.changeColumns()
}

export async function confirmColumnsForSection(
  kind: SectionKind,
  selections: Record<string, string>
): Promise<SectionSummary> {
  if (kind === 'device') {
    return window.api.device.confirmColumns({ deviceCol: selections.deviceCol, userCol: selections.userCol })
  }
  if (kind === 'legalHold') {
    return window.api.legalHold.confirmColumns({ firstCol: selections.firstCol, lastCol: selections.lastCol })
  }
  return window.api.district.confirmColumns({
    firstCol: selections.firstCol,
    lastCol: selections.lastCol,
    workCol: selections.workCol,
    homeCol: selections.homeCol
  })
}
