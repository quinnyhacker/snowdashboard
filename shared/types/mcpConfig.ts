import { z } from 'zod'

/** Mirrors the MCP server config shapes accepted by both the Claude Agent
 * SDK and @modelcontextprotocol/sdk's client transports. */
export const McpStdioConfigSchema = z.object({
  type: z.literal('stdio').optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional()
})

export const McpSseConfigSchema = z.object({
  type: z.literal('sse'),
  url: z.string().url(),
  headers: z.record(z.string()).optional()
})

export const McpHttpConfigSchema = z.object({
  type: z.literal('http'),
  url: z.string().url(),
  headers: z.record(z.string()).optional()
})

export const McpServerConfigSchema = z.union([McpStdioConfigSchema, McpSseConfigSchema, McpHttpConfigSchema])

export const McpConfigFileSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema)
})

export type McpStdioConfig = z.infer<typeof McpStdioConfigSchema>
export type McpSseConfig = z.infer<typeof McpSseConfigSchema>
export type McpHttpConfig = z.infer<typeof McpHttpConfigSchema>
export type McpServerConfigEntry = z.infer<typeof McpServerConfigSchema>
export type McpConfigFile = z.infer<typeof McpConfigFileSchema>

export const SERVICENOW_SERVER_NAME = 'servicenow'
export const M365_SERVER_NAME = 'microsoft365'
