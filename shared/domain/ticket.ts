/** Domain model for a ServiceNow work item, normalized from MCP tool responses
 * (get_my_work / get_my_opened_tickets / get_my_groups_work / find_task).
 */

export type TicketState =
  | 'New'
  | 'In Progress'
  | 'On Hold'
  | 'Resolved'
  | 'Closed'
  | 'Cancelled'
  | string

export interface TicketComment {
  id: string
  author: string
  body: string
  createdAt: string
  /** true when the ServiceNow work_notes field marks this internal-only */
  isWorkNote: boolean
}

export interface Ticket {
  sysId: string
  number: string
  shortDescription: string
  description?: string
  table: 'incident' | 'change_request' | 'sc_task' | 'problem' | string
  state: TicketState
  priority: string
  assignmentGroup: string
  assignedTo?: string
  requestedFor?: string
  dueDate?: string
  slaDueDate?: string
  createdAt: string
  updatedAt: string
  comments: TicketComment[]
  /** Raw sensitivity/classification label read off the record, if present. */
  sensitivityLabel?: string
  /** True when the app detected a CUI / Restricted marking and must not
   * surface the raw content in the UI. */
  isSensitivityFlagged: boolean
}

export type SlaUrgency = 'ok' | 'approaching' | 'breached'
