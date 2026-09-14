import type { DashboardFilters, SortDirection, SortField } from '@shared/types/preferences'

interface FilterBarProps {
  filters: DashboardFilters
  sortField: SortField
  sortDirection: SortDirection
  availableStates: string[]
  availableGroups: string[]
  onChangeFilters: (filters: DashboardFilters) => void
  onChangeSort: (field: SortField, direction: SortDirection) => void
  onRefresh: () => void
  isRefreshing: boolean
  lastRefreshedAt: string | undefined
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterBar(props: FilterBarProps): JSX.Element {
  const { filters, sortField, sortDirection, availableStates, availableGroups, onChangeFilters, onChangeSort, onRefresh, isRefreshing, lastRefreshedAt } = props

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs font-medium uppercase text-slate-400">State</span>
        {availableStates.map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => onChangeFilters({ ...filters, states: toggleValue(filters.states, state) })}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              filters.states.includes(state)
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {state}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs font-medium uppercase text-slate-400">Group</span>
        {availableGroups.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() =>
              onChangeFilters({ ...filters, assignmentGroups: toggleValue(filters.assignmentGroups, group) })
            }
            className={`rounded-full border px-2 py-0.5 text-xs ${
              filters.assignmentGroups.includes(group)
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1 text-xs text-slate-600">
        Min urgency
        <select
          value={filters.minUrgency}
          onChange={(e) =>
            onChangeFilters({ ...filters, minUrgency: e.target.value as DashboardFilters['minUrgency'] })
          }
          className="rounded border border-slate-200 px-1 py-0.5"
        >
          <option value="ok">All</option>
          <option value="approaching">Due soon+</option>
          <option value="breached">Past due only</option>
        </select>
      </label>

      <label className="flex items-center gap-1 text-xs text-slate-600">
        Sort
        <select
          value={sortField}
          onChange={(e) => onChangeSort(e.target.value as SortField, sortDirection)}
          className="rounded border border-slate-200 px-1 py-0.5"
        >
          <option value="dueDate">Due date</option>
          <option value="age">Age</option>
          <option value="priority">Priority</option>
          <option value="assignmentGroup">Assignment group</option>
          <option value="state">State</option>
        </select>
        <button
          type="button"
          onClick={() => onChangeSort(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
          className="rounded border border-slate-200 px-1.5 py-0.5"
          aria-label="Toggle sort direction"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </label>

      <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
        {lastRefreshedAt && <span>Updated {new Date(lastRefreshedAt).toLocaleTimeString()}</span>}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
