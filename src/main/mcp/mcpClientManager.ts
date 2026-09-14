import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { McpServerConfigEntry } from '@shared/types/mcpConfig'

/**
 * Manages direct (non-agentic) MCP client connections used for read-only
 * dashboard polling — listing/fetching tickets doesn't need to go through
 * an LLM turn, so this talks to the MCP servers directly for speed and
 * predictable cost. Chat-driven actions go through the separate Agent SDK
 * integration in src/main/agent, which manages its own MCP connections so
 * it can gate tool calls on user confirmation.
 */

function buildTransport(config: McpServerConfigEntry): Transport {
  if (config.type === 'sse') {
    return new SSEClientTransport(new URL(config.url), {
      requestInit: { headers: config.headers }
    })
  }
  if (config.type === 'http') {
    return new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers: config.headers }
    })
  }
  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) }
  })
}

class McpClientManager {
  private clients = new Map<string, Client>()
  private configs = new Map<string, McpServerConfigEntry>()

  configure(servers: Record<string, McpServerConfigEntry>): void {
    this.configs = new Map(Object.entries(servers))
  }

  private async getClient(serverName: string): Promise<Client> {
    const existing = this.clients.get(serverName)
    if (existing) return existing

    const config = this.configs.get(serverName)
    if (!config) {
      throw new Error(
        `MCP server "${serverName}" is not configured. Add it in Settings → MCP Connections.`
      )
    }

    const client = new Client({ name: 'servicenow-command-center', version: '0.1.0' })
    await client.connect(buildTransport(config))
    this.clients.set(serverName, client)
    return client
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const client = await this.getClient(serverName)
    const result = await client.callTool({ name: toolName, arguments: args })
    if (result.isError) {
      const message =
        Array.isArray(result.content) && result.content[0]?.type === 'text'
          ? result.content[0].text
          : `MCP tool "${toolName}" on "${serverName}" returned an error.`
      throw new Error(message)
    }
    return result
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close()
    }
    this.clients.clear()
  }

  isConfigured(serverName: string): boolean {
    return this.configs.has(serverName)
  }
}

export const mcpClientManager = new McpClientManager()
