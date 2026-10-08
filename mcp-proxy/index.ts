import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Mock Vault (in reality, this would query Doppler, AWS Secrets, or Supabase Vault)
const VAULT = {
  "proj-ehi-001": {
    vercel_token: "vercel_ehi_live_prod_tkn_8f73b",
    supabase_url: "https://ehi-db.supabase.co",
    supabase_service_role: "ey_ehi_service_role_key_mock",
    resend_key: "re_ehi_live_9x28h"
  },
  "proj-iya-001": {
    vercel_token: "vercel_iyanu_dev_tkn_1a99c",
    supabase_url: "https://iyanu-db.supabase.co",
    supabase_service_role: "ey_iyanu_service_role_key_mock",
    resend_key: "re_iyanu_test_4m11q"
  }
};

const server = new Server({
  name: "aether-multi-tenant-proxy",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Expose the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "vercel_trigger_deploy",
        description: "Trigger a Vercel deployment for a specific project. Requires project_id.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "The AetherOrch project ID (e.g., proj-ehi-001)" }
          },
          required: ["project_id"]
        }
      },
      {
        name: "supabase_query",
        description: "Run a Postgres query against a project's isolated Supabase instance. Requires project_id.",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "The AetherOrch project ID" },
            query: { type: "string", description: "The SQL query to run" }
          },
          required: ["project_id", "query"]
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args || typeof args !== 'object' || !('project_id' in args)) {
    throw new Error("Missing required 'project_id' parameter in tool call.");
  }

  const projectId = args.project_id as string;
  const credentials = VAULT[projectId as keyof typeof VAULT];

  if (!credentials) {
    return {
      content: [
        {
          type: "text",
          text: `Error: No credentials found in vault for project_id '${projectId}'. Authorization denied.`
        }
      ],
      isError: true
    };
  }

  if (name === "vercel_trigger_deploy") {
    // In a real proxy, we would do:
    // fetch('https://api.vercel.com/v13/deployments', { headers: { Authorization: `Bearer ${credentials.vercel_token}` } })
    return {
      content: [
        {
          type: "text",
          text: `[Vercel Proxy] Successfully authenticated with Vercel using token '${credentials.vercel_token.substring(0, 10)}...'. Deployment triggered for project ${projectId}.`
        }
      ]
    };
  }

  if (name === "supabase_query") {
    const query = args.query as string;
    // In a real proxy, we would do:
    // fetch(`${credentials.supabase_url}/rest/v1/...`, { headers: { apikey: credentials.supabase_service_role } })
    return {
      content: [
        {
          type: "text",
          text: `[Supabase Proxy] Connected to ${credentials.supabase_url}.\nExecuted query: ${query}\nResult: [Mocked rows returned]`
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Multi-Tenant MCP Proxy running on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
