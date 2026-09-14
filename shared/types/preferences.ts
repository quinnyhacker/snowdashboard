export type SortField = 'dueDate' | 'age' | 'priority' | 'assignmentGroup' | 'state'
export type SortDirection = 'asc' | 'desc'

export interface DashboardFilters {
  states: string[]
  assignmentGroups: string[]
  /** Only show tickets with SLA urgency at or above this level. */
  minUrgency: 'ok' | 'approaching' | 'breached'
}

export interface ViewPreferences {
  filters: DashboardFilters
  sortField: SortField
  sortDirection: SortDirection
  /** 'cards' or 'table' */
  layout: 'cards' | 'table'
  chatPanelPosition: 'sidebar' | 'bottom'
  chatPanelSize: number
  autoRefreshMs: number
  mcpConfigPath?: string
}

export const DEFAULT_PREFERENCES: ViewPreferences = {
  filters: { states: [], assignmentGroups: [], minUrgency: 'ok' },
  sortField: 'dueDate',
  sortDirection: 'asc',
  layout: 'cards',
  chatPanelPosition: 'sidebar',
  chatPanelSize: 380,
  autoRefreshMs: 5 * 60 * 1000
}
