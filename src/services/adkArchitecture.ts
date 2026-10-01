/**
 * Google ADK (Agent Development Kit) & Task Dispatcher Architecture
 * Contains the production-ready Python ADK agent definitions,
 * Cost Instrumentor, Trace Writer, Custom MCP Servers (Supabase + Vercel),
 * and the orchestrator task dispatcher loop with DAG resolution & Realtime subscriptions.
 */

export interface ADKAgentDoc {
  name: string;
  role: string;
  model: string;
  framework: string;
  mcpTools: string[];
  protocol: 'local_adk' | 'a2a_remote';
  code: string;
  description: string;
  agentCard?: {
    name: string;
    version: string;
    description: string;
    capabilities: string[];
    skills: string[];
    endpoint: string;
  };
}

export const ADK_AGENTS: ADKAgentDoc[] = [
  {
    name: 'CoordinatorAgent',
    role: 'Root Orchestrator & Dispatcher',
    model: 'gemini-3.5-flash',
    framework: 'google.adk.agents.LlmAgent',
    mcpTools: ['supabase_mcp', 'github_mcp'],
    protocol: 'local_adk',
    description: 'Polls and receives queued tasks, coordinates multi-agent workflows using AgentTool encapsulation to keep control, and dispatches to specialists.',
    code: `# orchestrator/agents/coordinator.py
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.mcp_tool import MCPToolset, StdioConnectionParams, HttpConnectionParams

from .coding_agent import CodingAgent
from .qa_agent import QAAgent
from .review_agent import ReviewAgent
from .deploy_agent import DeployAgent

# MCP servers the coordinator can call directly
supabase_mcp = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "npx",
            "args": ["-y", "@supabase/mcp-server-supabase"],
            "env": {"SUPABASE_ACCESS_TOKEN": "..."},
        },
    ),
)

github_mcp = MCPToolset(
    connection_params=HttpConnectionParams(
        url="https://api.githubcopilot.com/mcp/",
        headers={"Authorization": "Bearer ..."},
    ),
)

# The coordinator — its only job is to route, not to do work
coordinator = LlmAgent(
    name="CoordinatorAgent",
    model="gemini-3.5-flash",
    description="Routes agent_tasks to the correct specialist agent.",
    instruction="""
    You are the EHI Platform Coordinator. You read queued tasks from
    the agent_tasks table and dispatch them to the correct specialist.

    Routing rules:
    - BUILD_FEATURE, FIX_BUG          → delegate to CodingAgent
    - QA_EXPLORE, QA_REPLAY,
      QA_TARGETED, QA_DIFF,
      QA_SECURITY                     → delegate to QAAgent
    - DEPLOY                          → delegate to DeployAgent
    - Any task whose result must be
      verified before approval        → delegate to ReviewAgent

    Never do work yourself. Your only output is a delegation decision
    and a short rationale. If a task doesn't match a rule, mark it
    'blocked' and write the reason to agent_traces.
    """,
    tools=[
        # Specialists exposed as tools — coordinator remains in control
        AgentTool(agent=CodingAgent),
        AgentTool(agent=QAAgent),
        AgentTool(agent=ReviewAgent),
        AgentTool(agent=DeployAgent),
        supabase_mcp,
        github_mcp,
    ],
)`
  },
  {
    name: 'CodingAgent',
    role: 'Autonomous Software Engineer',
    model: 'gemini-3.5-flash',
    framework: 'google.adk.agents.LlmAgent / RemoteA2aAgent',
    mcpTools: ['filesystem_mcp', 'github_mcp'],
    protocol: 'a2a_remote',
    description: 'Implements features and fixes bugs in isolated git worktrees. Executes planning -> coding -> testing -> branch creation -> pull request flow.',
    agentCard: {
      name: 'CodingAgent',
      version: '1.4.0',
      description: 'Builds features and fixes bugs in client repositories.',
      capabilities: ['git_worktree_isolation', 'filesystem_edit', 'test_execution', 'pr_creation'],
      skills: ['code_implementation', 'schema_migration', 'unit_testing'],
      endpoint: 'https://coding-agent.ehi.internal/.well-known/agent-card.json'
    },
    code: `# orchestrator/agents/coding_agent.py
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, StdioConnectionParams, HttpConnectionParams

filesystem_mcp = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspaces"],
        },
    ),
)

github_mcp = MCPToolset(
    connection_params=HttpConnectionParams(
        url="https://api.githubcopilot.com/mcp/",
        headers={"Authorization": "Bearer ..."},
    ),
)

CodingAgent = LlmAgent(
    name="CodingAgent",
    model="gemini-3.5-flash",
    description="Builds features and fixes bugs in client repositories.",
    instruction="""
    You are the EHI Coding Agent. You receive a task with:
      - project_id: which repo to work in
      - prompt: the natural-language instruction
      - workspace_path: an isolated git worktree

    Your workflow, in order:
    1. Read the task and the project's agent_instructions (coding standards,
       testing policy). Every project has its own rules — respect them.
    2. Explore the repository using the filesystem tools. Read files
       before editing them.
    3. Plan the change. Write the plan to agent_results as step_type='planning'.
       Do NOT start coding until the plan is written.
    4. Implement the change. Edit files using the filesystem tools.
    5. Run the project's test suite. If tests fail, iterate until they pass.
    6. Commit to a branch named agent/task-{task_id}.
    7. Open a pull request via the GitHub MCP tool, with the plan as
       the PR description.
    8. Write the PR URL to agent_tasks.pr_url.

    Never push to main. Never modify files outside workspace_path.
    Never skip tests.
    """,
    tools=[filesystem_mcp, github_mcp],
)`
  },
  {
    name: 'QAAgent',
    role: 'Autonomous Multi-Platform Tester',
    model: 'gemini-3.5-flash',
    framework: 'google.adk.agents.LlmAgent / RemoteA2aAgent',
    mcpTools: ['agent_qa_mcp (web/mobile)', 'mk_qa_mcp (api)'],
    protocol: 'a2a_remote',
    description: 'Conducts autonomous QA across Web, Mobile (Maestro), and API (Schemathesis + Newman) with zero-token headless replay script synthesis.',
    agentCard: {
      name: 'QAAgent',
      version: '2.1.0',
      description: 'Runs autonomous QA against web, mobile, and API surfaces.',
      capabilities: ['dom_crawl', 'replay_script_generation', 'maestro_mobile', 'schemathesis_api', 'rbac_security_matrix'],
      skills: ['regression_testing', 'replay_execution', 'targeted_diff_testing'],
      endpoint: 'https://qa-agent.ehi.internal/.well-known/agent-card.json'
    },
    code: `# orchestrator/agents/qa_agent.py
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, StdioConnectionParams

# agent-qa MCP server — web + mobile QA
agent_qa_mcp = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "npx",
            "args": ["-y", "agent-qa", "mcp"],
            "env": {"ANTHROPIC_API_KEY": "..."},
        },
    ),
)

# mk-qa-master MCP server — API + backend QA
mk_qa_mcp = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "mk-qa-master",
            "args": ["mcp"],
        },
    ),
)

QAAgent = LlmAgent(
    name="QAAgent",
    model="gemini-3.5-flash",
    description="Runs autonomous QA against web, mobile, and API surfaces.",
    instruction="""
    You are the EHI QA Agent. You receive a task with:
      - project_id
      - target_url: the URL to test
      - target_platform: 'web' | 'mobile' | 'api'
      - role_tested: which user role to simulate
      - run_type: 'explore' | 'replay' | 'targeted' | 'diff' | 'security'

    Dispatch by platform:
      - web    → use agent-qa MCP (self-healing, natural-language tests)
      - api    → use mk-qa-master MCP (Schemathesis + Newman)
      - mobile → use agent-qa MCP with Maestro drivers

    Dispatch by run_type:
      - explore  → full autonomous crawl. Generate a replay script
                   and save it to qa/replays/{project}-{flow}.yaml.
      - replay   → run the stored replay script. No AI inference.
      - targeted → navigate directly to the feature named in the prompt.
      - diff     → read the git diff, test only changed surfaces.
      - security → for each role in the project's role matrix, verify
                   the role can see what it should and cannot see what
                   it shouldn't.

    For every finding, write a row to qa_findings with severity, title,
    description, component, and reproduction steps.

    Never test against real users. Use the synthetic account credentials
    from the project's Vault secrets.
    """,
    tools=[agent_qa_mcp, mk_qa_mcp],
)`
  },
  {
    name: 'ReviewAgent',
    role: 'Adversarial Code & Invariant Critic',
    model: 'claude-sonnet-4',
    framework: 'google.adk.agents.LlmAgent',
    mcpTools: ['github_mcp', 'supabase_toolset'],
    protocol: 'local_adk',
    description: 'Uses an independent critic model (Claude Sonnet 4) to verify diff boundaries, test execution, schema invariants, and RLS security before human approval.',
    code: `# orchestrator/agents/review_agent.py
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, HttpConnectionParams

from .toolsets import supabase_toolset

github_mcp = MCPToolset(
    connection_params=HttpConnectionParams(
        url="https://api.githubcopilot.com/mcp/",
        headers={"Authorization": "Bearer ..."},
    ),
)

ReviewAgent = LlmAgent(
    name="ReviewAgent",
    model="claude-sonnet-4",  # deliberate different model from coder
    description="Reviews coding-agent PRs before human approval.",
    instruction="""
    You are the EHI Review Agent. You receive a PR URL from the coding agent.

    Your job is adversarial review, not approval. Assume the coder made
    a mistake until you've verified otherwise.

    Check, in order:
    1. Does the diff match the stated plan? If the coder did something
       different from what they said they'd do, flag it.
    2. Does the diff touch any file outside workspace_path? If yes, reject.
    3. Are there tests for the new behavior? If not, reject.
    4. Do the tests actually pass? Run them yourself — don't trust the
       coder's claim.
    5. Are there obvious security issues? (hardcoded secrets, SQL
       injection, unvalidated input, missing RLS)
    6. Does the change break any existing test? Run the full suite.

    Write your verdict to agent_results as step_type='review', with
    status 'approved' or 'rejected'. If rejected, write specific
    feedback the coder can act on.

    Use a different model than the coder on purpose. You're the critic.
    """,
    tools=[github_mcp, supabase_toolset],
)`
  },
  {
    name: 'DeployAgent',
    role: 'Deployment & Rollback Operator',
    model: 'gemini-3.5-flash',
    framework: 'google.adk.agents.LlmAgent',
    mcpTools: ['vercel_toolset'],
    protocol: 'local_adk',
    description: 'Triggers Vercel production releases, polls deployment health, conducts post-deploy synthetic tests, and initiates automated rollbacks if health checks fail.',
    code: `# orchestrator/agents/deploy_agent.py
from google.adk.agents import LlmAgent
from .toolsets import vercel_toolset

DeployAgent = LlmAgent(
    name="DeployAgent",
    model="gemini-3.5-flash",
    description="Handles deployment and rollback for client projects.",
    instruction="""
    You are the EHI Deploy Agent.

    Deploy workflow:
    1. Verify the PR for this task is merged to main.
    2. Trigger the Vercel deployment via the Vercel MCP tool.
    3. Poll the deployment status until it reaches 'ready' or 'error'.
    4. If 'ready', run a health check against the deployed URL.
    5. If the health check passes, write the deployment URL to
       agent_tasks.result and mark the task 'done'.
    6. If the health check fails, trigger a rollback to the previous
       deployment and mark the task 'failed' with the rollback reason.

    Never deploy if the Review Agent hasn't approved. Never skip the
    health check.
    """,
    tools=[vercel_toolset],
)`
  }
];

export const PYTHON_TASK_DISPATCHER_CODE = `# ==============================================================================
# orchestrator/dispatcher.py — Production ADK Multi-Agent Task Dispatcher Loop
# ==============================================================================
import asyncio
import os
from datetime import datetime
from supabase import create_client, Client
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agents.coordinator import coordinator
from cost_instrumentor import CostInstrumentor
from trace_writer import TraceWriter

# ── Supabase client (service role — bypasses RLS for dispatcher) ──
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

# ── ADK Runner ──
session_service = InMemorySessionService()
runner = Runner(
    agent=coordinator,
    app_name="ehi_platform",
    session_service=session_service,
)

# ── Instruments ──
cost = CostInstrumentor(supabase)
tracer = TraceWriter(supabase)

POLL_INTERVAL = 30       # seconds between fallback polls
MAX_CONCURRENT = 3       # max tasks running simultaneously
SESSION_TIMEOUT = 600    # 10 minutes per ADK session (ADK limit is 12)


async def notify(org_id: str, project_id: str, severity: str, title: str, body: str):
    """Inserts real-time alert into notifications table."""
    supabase.table("notifications").insert({
        "org_id": org_id,
        "project_id": project_id,
        "severity": severity,
        "title": title,
        "body": body,
        "category": "budget_alert" if "budget" in title.lower() else "approval_needed",
        "read": False,
        "created_at": datetime.utcnow().isoformat()
    }).execute()


async def check_budget(task: dict) -> bool:
    """Return False if the project is over budget and hard_stop is on."""
    result = supabase.rpc(
        "project_month_spend",
        {"p_project_id": task["project_id"]},
    ).execute()
    spend = float(result.data or 0.0)

    budget = supabase.table("project_budgets") \\
        .select("monthly_limit_usd, alert_threshold_pct, hard_stop") \\
        .eq("project_id", task["project_id"]) \\
        .maybe_single() \\
        .execute()

    if not budget.data:
        return True  # no budget set = unlimited

    limit = float(budget.data["monthly_limit_usd"])
    threshold = float(budget.data["alert_threshold_pct"]) / 100.0

    if spend >= limit and budget.data["hard_stop"]:
        await notify(
            org_id=task["org_id"],
            project_id=task["project_id"],
            severity="critical",
            title="Budget hard-stop triggered",
            body=f"Project exceeded \${limit:.2f} monthly budget. Task paused.",
        )
        return False

    if spend >= limit * threshold:
        await notify(
            org_id=task["org_id"],
            project_id=task["project_id"],
            severity="warning",
            title="Budget alert",
            body=f"Project at {spend/limit*100:.0f}% of monthly budget.",
        )

    return True


async def check_dependencies(task: dict) -> bool:
    """Return True if all dependencies are satisfied."""
    deps = supabase.table("task_dependencies") \\
        .select("depends_on_task_id, condition") \\
        .eq("task_id", task["id"]) \\
        .execute()

    if not deps.data:
        return True

    for dep in deps.data:
        dep_task = supabase.table("agent_tasks") \\
            .select("status, result") \\
            .eq("id", dep["depends_on_task_id"]) \\
            .single() \\
            .execute()

        if not dep_task.data:
            return False

        status = dep_task.data["status"]
        condition = dep["condition"]

        if condition == "completed" and status not in ("done", "awaiting_approval"):
            return False
        if condition == "succeeded" and status != "done":
            return False
        if condition == "pr_merged":
            result = dep_task.data.get("result") or {}
            if not result.get("pr_merged"):
                return False

    return True


async def dispatch_task(task: dict) -> None:
    """Run a single task through the ADK coordinator."""
    task_id = task["id"]
    session_id = f"task-{task_id}"

    # 1. Mark running
    supabase.table("agent_tasks").update({
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
    }).eq("id", task_id).execute()

    # 2. Create ADK session
    await session_service.create_session(
        app_name="ehi_platform",
        user_id=task["org_id"],
        session_id=session_id,
    )

    # 3. Build the user prompt — the coordinator reads everything else from DB
    prompt = f"""
    Task ID: {task_id}
    Project: {task['project_id']}
    Type: {task['task_type']}
    Prompt: {task['prompt']}

    Route this to the correct specialist. Write your plan to agent_results
    as step_type='planning' before delegating. Do not do the work yourself.
    """

    content = types.Content(role="user", parts=[types.Part(text=prompt)])

    # 4. Run the ADK agent loop, instrumenting every event
    try:
        async with asyncio.timeout(SESSION_TIMEOUT):
            async for event in runner.run_async(
                user_id=task["org_id"],
                session_id=session_id,
                new_message=content,
            ):
                # Every event is a step — write to traces + cost
                await tracer.write_from_event(task_id, event)
                await cost.write_from_event(task_id, event)

                # Stream progress to Supabase Realtime
                if event.content and event.content.parts:
                    step_text = event.content.parts[0].text or ""
                    if step_text:
                        supabase.table("agent_results").insert({
                            "task_id": task_id,
                            "step_number": event.turn_index or 0,
                            "step_type": _classify_step(event),
                            "content": step_text,
                            "model_used": getattr(event, "model_version", "gemini-3.5-flash"),
                        }).execute()

    except asyncio.TimeoutError:
        supabase.table("agent_tasks").update({
            "status": "failed",
            "result": {"error": "Session timeout after 10 minutes"},
        }).eq("id", task_id).execute()
        return

    # 5. Read the final result from the session
    session = await session_service.get_session(
        app_name="ehi_platform",
        user_id=task["org_id"],
        session_id=session_id,
    )

    final_text = session.state.get("final_response", "")

    supabase.table("agent_tasks").update({
        "status": "awaiting_approval",
        "result": {"summary": final_text},
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", task_id).execute()


def _classify_step(event) -> str:
    """Map an ADK event to a step_type for agent_results."""
    author = getattr(event, "author", "")
    if author == "CodingAgent":
        return "coding"
    if author == "QAAgent":
        return "testing"
    if author == "ReviewAgent":
        return "review"
    if author == "DeployAgent":
        return "deploy"
    return "planning"


async def process_queue() -> None:
    """Pull queued tasks, check dependencies + budget, dispatch."""
    queued = supabase.table("agent_tasks") \\
        .select("id, org_id, project_id, task_type, prompt, parent_task_id") \\
        .eq("status", "queued") \\
        .order("created_at") \\
        .limit(MAX_CONCURRENT) \\
        .execute()

    if not queued.data:
        return

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def run_with_semaphore(task):
        async with semaphore:
            if not await check_dependencies(task):
                supabase.table("agent_tasks").update({
                    "status": "blocked",
                }).eq("id", task["id"]).execute()
                return
            if not await check_budget(task):
                supabase.table("agent_tasks").update({
                    "status": "blocked",
                    "result": {"error": "Budget hard-stop"},
                }).eq("id", task["id"]).execute()
                return
            await dispatch_task(task)

    await asyncio.gather(*[run_with_semaphore(t) for t in queued.data])


async def main_loop() -> None:
    """Poll every POLL_INTERVAL seconds. Realtime handler triggers this too."""
    while True:
        try:
            await process_queue()
        except Exception as e:
            # Log but never crash the dispatcher
            supabase.table("agent_traces").insert({
                "trace_type": "error",
                "error_message": str(e),
                "metadata": {"source": "dispatcher.main_loop"},
            }).execute()
        await asyncio.sleep(POLL_INTERVAL)


# ── Realtime handler: trigger immediate dispatch on new task ──
async def watch_tasks() -> None:
    """Subscribe to agent_tasks INSERT events for instant dispatch."""
    def on_insert(payload):
        asyncio.create_task(process_queue())

    supabase.table("agent_tasks") \\
        .on("INSERT", on_insert) \\
        .subscribe()


if __name__ == "__main__":
    asyncio.run(asyncio.gather(main_loop(), watch_tasks()))
`;

export const PYTHON_COST_INSTRUMENTOR_CODE = `# ==============================================================================
# orchestrator/cost_instrumentor.py — Per-Token & Per-Call Attribution Engine
# ==============================================================================
import os
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from supabase import Client
from google.adk.events import Event

# ── Pricing table (updated 2026-09) ──
# Price per 1M tokens in USD
PRICING: dict[str, dict[str, Decimal]] = {
    "gemini-3.5-flash":     {"input": Decimal("0.75"),  "output": Decimal("3.00")},
    "gemini-3.5-pro":       {"input": Decimal("3.50"),  "output": Decimal("10.50")},
    "claude-sonnet-4":      {"input": Decimal("3.00"),  "output": Decimal("15.00")},
    "claude-opus-4":        {"input": Decimal("15.00"), "output": Decimal("75.00")},
    "grok-4":               {"input": Decimal("3.00"),  "output": Decimal("15.00")},
    "gpt-5":                {"input": Decimal("2.50"),  "output": Decimal("10.00")},
}

class CostInstrumentor:
    """
    Wraps every LLM call in the ADK agent runtime and writes a
    cost_events row for each. Reads token counts from the event's
    usage_metadata to calculate exact costs.
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def write_from_event(self, task_id: str, event: Event) -> None:
        """
        Called by the dispatcher for every ADK event.
        Extracts token usage and writes a cost_events row.
        """
        usage = getattr(event, "usage_metadata", None)
        if not usage:
            return

        model = getattr(event, "model_version", None) or "unknown"
        pricing = PRICING.get(model)
        if not pricing:
            # Unknown model — log zero-cost row so it's visible, not silent
            await self._insert_cost(
                task_id=task_id,
                provider=self._provider_from_model(model),
                model=model,
                tokens_input=0,
                tokens_output=0,
                cost_usd=Decimal("0"),
                endpoint="unknown_model",
            )
            return

        tokens_in = int(getattr(usage, "prompt_token_count", 0) or 0)
        tokens_out = int(getattr(usage, "candidates_token_count", 0) or 0)

        cost = (
            (Decimal(tokens_in) / Decimal(1_000_000)) * pricing["input"]
            + (Decimal(tokens_out) / Decimal(1_000_000)) * pricing["output"]
        )

        await self._insert_cost(
            task_id=task_id,
            provider=self._provider_from_model(model),
            model=model,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            cost_usd=cost,
            endpoint="adk_llm_call",
        )

    async def _insert_cost(
        self,
        task_id: str,
        provider: str,
        model: str,
        tokens_input: int,
        tokens_output: int,
        cost_usd: Decimal,
        endpoint: str,
    ) -> None:
        task = self.supabase.table("agent_tasks") \\
            .select("org_id, project_id, task_type, prompt") \\
            .eq("id", task_id) \\
            .single() \\
            .execute()

        if not task.data:
            return

        attributed_to = self._derive_attribution(task.data)

        self.supabase.table("cost_events").insert({
            "org_id": task.data["org_id"],
            "project_id": task.data["project_id"],
            "task_id": task_id,
            "provider": provider,
            "model": model,
            "endpoint": endpoint,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "cost_usd": float(cost_usd),
            "attributed_to": attributed_to,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()

    @staticmethod
    def _provider_from_model(model: str) -> str:
        if model.startswith("gemini") or model.startswith("gemma"):
            return "google"
        if model.startswith("claude"):
            return "anthropic"
        if model.startswith("grok"):
            return "xai"
        if model.startswith("gpt") or model.startswith("o1") or model.startswith("o3"):
            return "openai"
        return "local"

    @staticmethod
    def _derive_attribution(task_data: dict) -> Optional[str]:
        task_type = task_data.get("task_type", "")
        prompt = (task_data.get("prompt") or "")[:80].lower()

        if task_type == "BUILD_FEATURE":
            slug = "-".join(prompt.split()[:5])
            return f"FEATURE:{slug}"
        if task_type == "FIX_BUG":
            slug = "-".join(prompt.split()[:5])
            return f"BUG:{slug}"
        if task_type.startswith("QA_"):
            return f"QA:{task_type}"
        if task_type == "DEPLOY":
            return "DEPLOY"
        if task_type == "REPORT":
            return "REPORT"
        return None

class BudgetGuard:
    """
    Checks project budget before each model call. Two thresholds:
      - alert_threshold_pct: warn (e.g. 80% of monthly limit)
      - monthly_limit_usd: hard stop (pause queued tasks)
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def check(self, project_id: str) -> tuple[bool, str]:
        spend_result = self.supabase.rpc(
            "project_month_spend",
            {"p_project_id": project_id},
        ).execute()
        spend = Decimal(str(spend_result.data or 0))

        budget_result = self.supabase.table("project_budgets") \\
            .select("monthly_limit_usd, alert_threshold_pct, hard_stop") \\
            .eq("project_id", project_id) \\
            .maybe_single() \\
            .execute()

        if not budget_result.data:
            return True, "no budget set"

        limit = Decimal(str(budget_result.data["monthly_limit_usd"]))
        threshold = Decimal(str(budget_result.data["alert_threshold_pct"])) / 100
        hard_stop = budget_result.data["hard_stop"]

        if spend >= limit and hard_stop:
            return False, f"hard stop: \${spend:.2f} >= \${limit:.2f}"

        if spend >= limit * threshold:
            await self._notify(
                project_id=project_id,
                severity="warning",
                title="Budget alert",
                body=f"Project at {spend/limit*100:.0f}% of monthly budget (\${spend:.2f}/\${limit:.2f}).",
            )

        return True, "ok"

    async def _notify(self, project_id: str, severity: str, title: str, body: str) -> None:
        project = self.supabase.table("project_registry") \\
            .select("org_id") \\
            .eq("id", project_id) \\
            .single() \\
            .execute()

        if not project.data:
            return

        self.supabase.table("notifications").insert({
            "org_id": project.data["org_id"],
            "project_id": project_id,
            "severity": severity,
            "title": title,
            "body": body,
            "category": "budget_alert",
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
`;

export const PYTHON_TRACE_WRITER_CODE = `# ==============================================================================
# orchestrator/trace_writer.py — Observability & Tool Telemetry Writer
# ==============================================================================
import hashlib
import time
from typing import Any
from supabase import Client
from google.adk.events import Event

class TraceWriter:
    """
    Writes an agent_traces row for every ADK event, MCP tool call,
    and A2A delegation. This is the debugging record that lets you
    replay exactly what an agent did.
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def write_from_event(self, task_id: str, event: Event) -> None:
        trace_type = self._classify(event)
        tool_name = self._extract_tool_name(event)
        error = self._extract_error(event)

        self.supabase.table("agent_traces").insert({
            "task_id": task_id,
            "step_number": getattr(event, "turn_index", 0) or 0,
            "trace_type": trace_type,
            "tool_name": tool_name,
            "server_name": self._extract_server_name(event),
            "input_hash": self._hash(getattr(event, "content", None)),
            "output_hash": self._hash(getattr(event, "output", None)),
            "duration_ms": self._extract_duration(event),
            "error_message": error,
            "error_stack": None,
            "metadata": {"author": getattr(event, "author", None)},
            "created_at": datetime.utcnow().isoformat(),
        }).execute()

    @staticmethod
    def _classify(event: Event) -> str:
        if getattr(event, "error_code", None) or getattr(event, "error", None):
            return "error"
        if hasattr(event, "tool_call") and event.tool_call:
            return "mcp_tool_call"
        if getattr(event, "is_a2a_delegation", False):
            return "a2a_delegation"
        if getattr(event, "model_version", None):
            return "model_call"
        return "adk_call"

    @staticmethod
    def _extract_tool_name(event: Event) -> str | None:
        tc = getattr(event, "tool_call", None)
        if tc:
            return getattr(tc, "name", None)
        return None

    @staticmethod
    def _extract_server_name(event: Event) -> str | None:
        tc = getattr(event, "tool_call", None)
        if tc:
            return getattr(tc, "server", None)
        return None

    @staticmethod
    def _extract_error(event: Event) -> str | None:
        return getattr(event, "error_message", None) or (str(event.error) if hasattr(event, "error") and event.error else None)

    @staticmethod
    def _extract_duration(event: Event) -> int | None:
        start = getattr(event, "started_at", None)
        end = getattr(event, "ended_at", None)
        if start and end:
            return int((end - start) * 1000)
        return getattr(event, "duration_ms", None)

    @staticmethod
    def _hash(obj: Any) -> str | None:
        if obj is None:
            return None
        return hashlib.sha256(str(obj).encode()).hexdigest()[:16]
`;

export const COST_QUERIES_TS_CODE = `// packages/shared/src/cost.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/** Total spend for a project this month */
export async function projectMonthlySpend(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('cost_events')
    .select('cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', start.toISOString());

  return (data ?? []).reduce((sum, e) => sum + Number(e.cost_usd), 0);
}

/** Spend by provider for a project (Google / Anthropic / xAI / OpenAI) */
export async function spendByProvider(
  supabase: SupabaseClient,
  projectId: string,
  sinceIso: string,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('cost_events')
    .select('provider, cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', sinceIso);

  const byProvider: Record<string, number> = {};
  for (const e of data ?? []) {
    byProvider[e.provider] = (byProvider[e.provider] ?? 0) + Number(e.cost_usd);
  }
  return byProvider;
}

/** Spend by attribution tag — answers "how much did this feature cost?" */
export async function spendByAttribution(
  supabase: SupabaseClient,
  projectId: string,
  sinceIso: string,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('cost_events')
    .select('attributed_to, cost_usd')
    .eq('project_id', projectId)
    .not('attributed_to', 'is', null)
    .gte('created_at', sinceIso);

  const byTag: Record<string, number> = {};
  for (const e of data ?? []) {
    if (!e.attributed_to) continue;
    byTag[e.attributed_to] = (byTag[e.attributed_to] ?? 0) + Number(e.cost_usd);
  }
  return byTag;
}

/** Daily spend trend for a project — powers the line chart */
export async function dailySpendTrend(
  supabase: SupabaseClient,
  projectId: string,
  days: number = 30,
): Promise<{ date: string; cost: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('cost_events')
    .select('created_at, cost_usd')
    .eq('project_id', projectId)
    .gte('created_at', since.toISOString())
    .order('created_at');

  const byDate: Record<string, number> = {};
  for (const e of data ?? []) {
    const date = e.created_at.slice(0, 10);
    byDate[date] = (byDate[date] ?? 0) + Number(e.cost_usd);
  }

  return Object.entries(byDate)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
`;

export const TAURI_COMMANDS_RS_CODE = `// packages/desktop/src-tauri/src/commands/ide.rs
use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::State;

pub struct IdeProcesses(pub Mutex<Vec<(String, Child)>>);

#[tauri::command]
pub fn start_code_server(
    project_id: String,
    workspace_path: String,
    state: State<IdeProcesses>,
) -> Result<String, String> {
    // Check if already running
    {
        let procs = state.0.lock().unwrap();
        if procs.iter().any(|(id, _)| id == &project_id) {
            return Ok(format!("http://localhost:8080/?folder={}", workspace_path));
        }
    }

    // Start code-server in isolated Docker container
    let child = Command::new("docker")
        .args([
            "run", "-d", "--rm",
            "-p", "0:8080",
            "-v", &format!("{}:/home/coder/workspace", workspace_path),
            "-e", "PASSWORD=local-dev",
            "codercom/code-server:latest",
            "--auth", "password",
        ])
        .spawn()
        .map_err(|e| format!("Failed to start code-server: {}", e))?;

    state.0.lock().unwrap().push((project_id.clone(), child));

    Ok(format!("http://localhost:8080/?folder={}", workspace_path))
}

#[tauri::command]
pub fn stop_code_server(project_id: String, state: State<IdeProcesses>) -> Result<(), String> {
    let mut procs = state.0.lock().unwrap();
    if let Some(pos) = procs.iter().position(|(id, _)| id == &project_id) {
        let (_, mut child) = procs.remove(pos);
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
`;

export const TOOLSETS_PY_CODE = `# orchestrator/toolsets.py
import os
from google.adk.tools.mcp_tool import MCPToolset, StdioConnectionParams

# Supabase MCP — available to coordinator and ReviewAgent
supabase_toolset = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "node",
            "args": ["mcp-servers/supabase/dist/index.js"],
            "env": {
                "SUPABASE_URL": os.environ["SUPABASE_URL"],
                "SUPABASE_SERVICE_ROLE_KEY": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            },
        },
    ),
)

# Vercel MCP — available to DeployAgent only
vercel_toolset = MCPToolset(
    connection_params=StdioConnectionParams(
        server_params={
            "command": "node",
            "args": ["mcp-servers/vercel/dist/index.js"],
            "env": {
                "SUPABASE_URL": os.environ["SUPABASE_URL"],
                "SUPABASE_SERVICE_ROLE_KEY": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
            },
        },
    ),
)
`;

export const MCP_SERVER_SCAFFOLDING = [
  {
    name: 'ehi-supabase (Custom MCP)',
    language: 'TypeScript / Node.js',
    path: 'mcp-servers/supabase/src/index.ts',
    tools: [
      { name: 'query_project_data', desc: 'RLS-scoped read of any table in project Supabase' },
      { name: 'write_project_data', desc: 'Insert, update, or upsert rows with schema validation' },
      { name: 'get_project_secrets', desc: 'Calls get_project_secrets RPC; returns keys present (never raw secrets)' }
    ],
    code: `// mcp-servers/supabase/src/index.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createClient } from "@supabase/supabase-js";
import * as z from "zod/v4";

serveStdio(() => {
  const server = new McpServer({
    name: "ehi-supabase",
    version: "1.0.0",
  });

  // Tool: query_project_data (RLS-scoped read)
  server.registerTool(
    "query_project_data",
    {
      description: "Query rows from a project's Supabase table (RLS-scoped).",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        table: z.string(),
        select: z.string().default("*"),
        filter_column: z.string().optional(),
        filter_value: z.string().optional(),
        limit: z.number().default(100),
      }),
    },
    async ({ project_id, table, select, filter_column, filter_value, limit }) => {
      const secrets = await fetchProjectSecrets(project_id);
      const client = createClient(secrets.supabase_url, secrets.supabase_key, {
        auth: { persistSession: false },
      });

      let query = client.from(table).select(select).limit(limit);
      if (filter_column && filter_value) {
        query = query.eq(filter_column, filter_value);
      }

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text", text: \`Error: \${error.message}\` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // Tool: write_project_data
  server.registerTool(
    "write_project_data",
    {
      description: "Insert or update rows in a project's Supabase table.",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        table: z.string(),
        operation: z.enum(["insert", "update", "upsert"]),
        payload: z.record(z.any()),
        match_column: z.string().optional(),
        match_value: z.string().optional(),
      }),
    },
    async ({ project_id, table, operation, payload, match_column, match_value }) => {
      const secrets = await fetchProjectSecrets(project_id);
      const client = createClient(secrets.supabase_url, secrets.supabase_key);

      let result;
      if (operation === "insert") {
        result = await client.from(table).insert(payload);
      } else if (operation === "upsert") {
        result = await client.from(table).upsert(payload);
      } else {
        if (!match_column || !match_value) {
          return { content: [{ type: "text", text: "update requires match_column and match_value" }] };
        }
        result = await client.from(table).update(payload).eq(match_column, match_value);
      }

      if (result.error) {
        return { content: [{ type: "text", text: \`Error: \${result.error.message}\` }] };
      }
      return { content: [{ type: "text", text: "OK" }] };
    },
  );

  // Tool: get_project_secrets (calls SECURITY DEFINER RPC)
  server.registerTool(
    "get_project_secrets",
    {
      description: "Fetch decrypted secrets for a project (service role only).",
      inputSchema: z.object({
        project_id: z.string().uuid(),
      }),
    },
    async ({ project_id }) => {
      const admin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data, error } = await admin.rpc("get_project_secrets", {
        p_project_id: project_id,
      });
      if (error) {
        return { content: [{ type: "text", text: \`Error: \${error.message}\` }] };
      }
      // Never return raw secrets to the model — return only the keys present
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ keys_present: Object.keys(data || {}) }),
        }],
      };
    },
  );

  return server;
});

async function fetchProjectSecrets(projectId: string): Promise<{
  supabase_url: string;
  supabase_key: string;
}> {
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await admin.rpc("get_project_secrets", {
    p_project_id: projectId,
  });
  if (error || !data) throw new Error(\`Failed to fetch secrets: \${error?.message}\`);
  return {
    supabase_url: data.supabase_url || \`https://\${projectId}.supabase.co\`,
    supabase_key: data.supabase_key,
  };
}`
  },
  {
    name: 'ehi-vercel (Custom MCP)',
    language: 'TypeScript / Node.js',
    path: 'mcp-servers/vercel/src/index.ts',
    tools: [
      { name: 'list_deployments', desc: 'List recent deployments for a project from Vercel REST API' },
      { name: 'trigger_deployment', desc: 'Creates preview or production deployment from git commit ref' },
      { name: 'get_deployment_status', desc: 'Polls deployment status until ready or error' },
      { name: 'rollback_deployment', desc: 'Rolls back live production traffic to previous deployment ID' }
    ],
    code: `// mcp-servers/vercel/src/index.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

serveStdio(() => {
  const server = new McpServer({
    name: "ehi-vercel",
    version: "1.0.0",
  });

  server.registerTool(
    "list_deployments",
    {
      description: "List recent deployments for a project.",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        limit: z.number().default(10),
      }),
    },
    async ({ project_id, limit }) => {
      const token = await getVercelToken(project_id);
      const projectName = await getVercelProjectName(project_id);

      const res = await fetch(
        \`https://api.vercel.com/v6/deployments?projectId=\${projectName}&limit=\${limit}\`,
        { headers: { Authorization: \`Bearer \${token}\` } },
      );
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "trigger_deployment",
    {
      description: "Trigger a new deployment for a project.",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        ref: z.string().default("main"),
      }),
    },
    async ({ project_id, ref }) => {
      const token = await getVercelToken(project_id);
      const projectName = await getVercelProjectName(project_id);

      const res = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          gitSource: { type: "github", ref },
        }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_deployment_status",
    {
      description: "Poll a deployment's status until ready or error.",
      inputSchema: z.object({
        deployment_id: z.string(),
        project_id: z.string().uuid(),
      }),
    },
    async ({ deployment_id, project_id }) => {
      const token = await getVercelToken(project_id);

      const res = await fetch(
        \`https://api.vercel.com/v13/deployments/\${deployment_id}\`,
        { headers: { Authorization: \`Bearer \${token}\` } },
      );
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "rollback_deployment",
    {
      description: "Roll back a project to a previous deployment.",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        deployment_id: z.string(),
      }),
    },
    async ({ project_id, deployment_id }) => {
      const token = await getVercelToken(project_id);
      const projectName = await getVercelProjectName(project_id);

      const res = await fetch(
        \`https://api.vercel.com/v9/projects/\${projectName}/rollback\`,
        {
          method: "POST",
          headers: {
            Authorization: \`Bearer \${token}\`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deploymentId: deployment_id }),
        },
      );
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  return server;
});

async function getVercelToken(projectId: string): Promise<string> {
  const secrets = await fetchProjectSecrets(projectId);
  return secrets.vercel_token;
}

async function getVercelProjectName(projectId: string): Promise<string> {
  return \`ehi-\${projectId.slice(0, 8)}\`;
}
`
  }
];
