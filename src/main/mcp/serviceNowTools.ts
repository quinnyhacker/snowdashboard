import { SERVICENOW_SERVER_NAME } from '@shared/types/mcpConfig'
import type { Ticket } from '@shared/domain/ticket'
import { mcpClientManager } from './mcpClientManager'
import { extractToolPayload, normalizeTicket, normalizeTicketList } from './normalize'

async function callServiceNow(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const result = await mcpClientManager.callTool(SERVICENOW_SERVER_NAME, toolName, args)
  return extractToolPayload(result)
}

export async function getMyWork(): Promise<Ticket[]> {
  return normalizeTicketList(await callServiceNow('get_my_work'))
}

export async function getMyOpenedTickets(): Promise<Ticket[]> {
  return normalizeTicketList(await callServiceNow('get_my_opened_tickets'))
}

export async function getMyGroupsWork(): Promise<Ticket[]> {
  return normalizeTicketList(await callServiceNow('get_my_groups_work'))
}

export async function findTask(query: string): Promise<Ticket[]> {
  const payload = await callServiceNow('find_task', { query })
  return normalizeTicketList(payload)
}

/** Fetches a single ticket's full detail (used by the ticket detail view,
 * which needs the complete field set and comment history rather than the
 * summarized list shape used for cards). */
export async function getTaskDetail(ticketNumberOrSysId: string): Promise<Ticket | undefined> {
  const payload = await callServiceNow('find_task', { query: ticketNumberOrSysId })
  const tickets = normalizeTicketList(payload)
  if (tickets.length > 0) return tickets[0]

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return normalizeTicket(payload as Record<string, unknown>)
  }
  return undefined
}

/** Fetches all three work views and merges them, deduping by sys_id. Used
 * for the dashboard's default "everything on my plate" view. */
export async function getAllMyWork(): Promise<Ticket[]> {
  const [mine, opened, groups] = await Promise.all([
    getMyWork().catch(() => []),
    getMyOpenedTickets().catch(() => []),
    getMyGroupsWork().catch(() => [])
  ])

  const bySysId = new Map<string, Ticket>()
  for (const ticket of [...mine, ...opened, ...groups]) {
    bySysId.set(ticket.sysId, ticket)
  }
  return Array.from(bySysId.values())
}
