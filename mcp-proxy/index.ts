import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Per-project credentials come from the environment, never from code.
// Same convention as the main proxy (server/proxySecurity.js):
//   PROXY_PROJECTS=<id>,<id>,...
//   <ID>_VERCEL_TOKEN, <ID>_SUPABASE_URL, <ID>_SUPABASE_SERVICE_ROLE, <ID>_RESEND_KEY
// where <ID> is the project id upper-cased with '-' -> '_'.
// There is no default project: an id that isn't configured is refused.
interface ProjectCredentials {
  vercel_token: string;
  supabase_url: string;
  supabase_service_role: string;
  resend_key: string;
}

function envKey(projectId: string, suffix: string): string {
  return `${projectId.toUpperCase().replace(/-/g, '_')}_${suffix}`;
}

export function loadVault(env: NodeJS.ProcessEnv = process.env): Record<string, ProjectCredentials> {
  const vault: Record<string, ProjectCredentials> = {};
  const ids = (env.PROXY_PROJECTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    vault[id] = {
      vercel_token: env[envKey(id, 'VERCEL_TOKEN')] || '',
      supabase_url: env[envKey(id, 'SUPABASE_URL')] || '',
      supabase_service_role: env[envKey(id, 'SUPABASE_SERVICE_ROLE')] || '',
      resend_key: env[envKey(id, 'RESEND_KEY')] || ''
    };
  }
  return vault;
}

const VAULT = loadVault();

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
            project_id: { type: "string", description: "The AetherOrch project ID (one of PROXY_PROJECTS)" }
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
  const credentials = Object.prototype.hasOwnProperty.call(VAULT, projectId) ? VAULT[projectId] : undefined;

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
          text: credentials.vercel_token
            ? `[Vercel Proxy] Vercel token configured for project ${projectId}. Deployment triggered.`
            : `[Vercel Proxy] No Vercel token configured for project ${projectId}.`
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
