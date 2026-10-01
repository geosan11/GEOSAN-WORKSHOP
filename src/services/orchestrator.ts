import {
  AgentTask,
  AgentResult,
  CostEvent,
  TaskType,
  LLMProvider,
  SubagentProgress
} from '../types';
import { INITIAL_MODEL_PRICING } from '../data/initialData';

export interface ModelRoute {
  task_type: TaskType;
  primary_model: string;
  fallback_model: string;
  verifier_model?: string;
  provider: LLMProvider;
  latency_target_ms: number;
}

export class ModelRouter {
  private static routes: Record<TaskType, ModelRoute> = {
    BUILD_FEATURE: {
      task_type: 'BUILD_FEATURE',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'claude-sonnet-4',
      verifier_model: 'claude-sonnet-4',
      provider: 'google',
      latency_target_ms: 1200
    },
    FIX_BUG: {
      task_type: 'FIX_BUG',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'claude-sonnet-4',
      verifier_model: 'claude-sonnet-4',
      provider: 'google',
      latency_target_ms: 800
    },
    QA_EXPLORE: {
      task_type: 'QA_EXPLORE',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'grok-4',
      provider: 'google',
      latency_target_ms: 600
    },
    QA_REPLAY: {
      task_type: 'QA_REPLAY',
      primary_model: 'headless-engine-zero-ai',
      fallback_model: 'gemini-3.5-flash',
      provider: 'google',
      latency_target_ms: 50
    },
    QA_TARGETED: {
      task_type: 'QA_TARGETED',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'claude-sonnet-4',
      provider: 'google',
      latency_target_ms: 700
    },
    QA_DIFF: {
      task_type: 'QA_DIFF',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'claude-sonnet-4',
      provider: 'google',
      latency_target_ms: 500
    },
    QA_SECURITY: {
      task_type: 'QA_SECURITY',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'grok-4',
      provider: 'google',
      latency_target_ms: 900
    },
    DEPLOY: {
      task_type: 'DEPLOY',
      primary_model: 'cloud-run-mcp-deployer',
      fallback_model: 'gemini-3.5-flash',
      provider: 'google',
      latency_target_ms: 2500
    },
    REPORT: {
      task_type: 'REPORT',
      primary_model: 'gemini-3.5-flash',
      fallback_model: 'grok-4',
      provider: 'google',
      latency_target_ms: 1000
    }
  };

  static getRoute(task_type: TaskType): ModelRoute {
    return this.routes[task_type] || this.routes.BUILD_FEATURE;
  }
}

export class CostInstrumentor {
  static calculateCost(
    model: string,
    tokens_input: number,
    tokens_output: number
  ): number {
    const pricing = INITIAL_MODEL_PRICING.find((p) => p.model === model);
    if (!pricing) {
      // Default to Gemini 3.5 Flash pricing
      return (tokens_input * 0.15 + tokens_output * 0.6) / 1_000_000;
    }
    const inputCost = (tokens_input * pricing.input_per_million) / 1_000_000;
    const outputCost = (tokens_output * pricing.output_per_million) / 1_000_000;
    return Number((inputCost + outputCost).toFixed(6));
  }

  static createCostEvent(params: {
    project_id: string;
    task_id: string;
    model: string;
    provider: LLMProvider;
    tokens_input: number;
    tokens_output: number;
    attributed_to: 'feature' | 'bug' | 'qa' | 'report' | 'infra';
    feature_name?: string;
  }): CostEvent {
    const cost_usd = this.calculateCost(params.model, params.tokens_input, params.tokens_output);
    return {
      id: `cost-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      project_id: params.project_id,
      task_id: params.task_id,
      provider: params.provider,
      model: params.model,
      endpoint: `/v1beta/models/${params.model}:generateContent`,
      tokens_input: params.tokens_input,
      tokens_output: params.tokens_output,
      cost_usd,
      attributed_to: params.attributed_to,
      feature_name: params.feature_name || 'Agent Execution',
      created_at: new Date().toISOString()
    };
  }
}

export interface SimulationStepPlan {
  step_number: number;
  step_type: 'planning' | 'coding' | 'testing' | 'verification';
  content: string;
  model: string;
  provider: LLMProvider;
  tokens_in: number;
  tokens_out: number;
  diff?: string;
  subagents?: SubagentProgress[];
}

export class AgentOrchestrator {
  /**
   * Generates a plan and steps for a newly dispatched task
   */
  static generateExecutionBlueprint(
    task: AgentTask,
    projectName: string
  ): {
    plan: NonNullable<AgentTask['plan']>;
    steps: SimulationStepPlan[];
  } {
    const isQA = task.task_type.startsWith('QA_');
    const isBug = task.task_type === 'FIX_BUG';
    const isDeploy = task.task_type === 'DEPLOY';

    if (isQA) {
      return {
        plan: {
          overview: `Autonomous QA test plan on ${projectName}: DOM tree inspection and interaction assertion.`,
          steps: [
            'Parse Accessibility Tree (AXTree) to index interactive controls (~280 tokens)',
            'Execute synthesized user action sequence and form submissions',
            'Assert zero uncaught console errors and network idempotency',
            'Serialize repeatable replay script in YAML for 30x headless verification'
          ],
          affected_files: ['qa/replays/auto_replay.yaml'],
          estimated_tokens: 32000
        },
        steps: [
          {
            step_number: 1,
            step_type: 'planning',
            content: `Mounted headless session. Traversed DOM accessibility tree for ${projectName}. Discovered 32 actionable nodes (buttons, inputs, selects).`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 8400,
            tokens_out: 950
          },
          {
            step_number: 2,
            step_type: 'testing',
            content: `Simulated full user journey. Clicked primary CTA, submitted payload, validated HTTP response codes. Verified zero layout shifts.`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 14200,
            tokens_out: 1600
          },
          {
            step_number: 3,
            step_type: 'verification',
            content: `Generated zero-inference replay script. Serialized state checks and exported to repository qa/replays/.`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 6500,
            tokens_out: 1100
          }
        ]
      };
    }

    if (isBug) {
      return {
        plan: {
          overview: `Resolve reported bug in ${projectName} with strict regression verification.`,
          steps: [
            'Analyze stack trace and identify divergent state flags',
            'Construct isolated reproduction test case using Comber/Proba MCP',
            'Draft backward-compatible patch in TypeScript with boundary checking',
            'Execute critic review with Claude Sonnet 4 before prompting approval'
          ],
          affected_files: ['src/modules/core/reconcile.ts', 'tests/unit/reconcile.test.ts'],
          estimated_tokens: 44000,
          subagents: ['Patch Author Subagent', 'Critic Reviewer Subagent']
        },
        steps: [
          {
            step_number: 1,
            step_type: 'planning',
            content: `Root cause identified: mismatched property naming in edge payload serialization during offline state queue replay.`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 11500,
            tokens_out: 1400
          },
          {
            step_number: 2,
            step_type: 'coding',
            content: `Drafted patch: implemented dual-read fallback and strict runtime schema validator.`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 15600,
            tokens_out: 2800,
            diff: `@@ -18,6 +18,12 @@
-   const val = event.receipt_mode;
+   // Fallback handling to support legacy sync payloads
+   const val = event.payment_mode ?? event.receipt_mode;
+   if (!val) {
+     throw new ValidationError('Payment mode missing in sync envelope');
+   }`
          },
          {
            step_number: 3,
            step_type: 'testing',
            content: `Ran 10 edge replay test cases. 10/10 passed without edge divergence.`,
            model: 'gemini-3.5-flash',
            provider: 'google',
            tokens_in: 9800,
            tokens_out: 1200
          },
          {
            step_number: 4,
            step_type: 'verification',
            content: `Claude Sonnet 4 review pass: Invariants verified. No regression on existing Supabase RLS row policies.`,
            model: 'claude-sonnet-4',
            provider: 'anthropic',
            tokens_in: 8200,
            tokens_out: 780
          }
        ]
      };
    }

    // Default: BUILD_FEATURE
    return {
      plan: {
        overview: `Implement requested capability: "${task.prompt.slice(0, 60)}..."`,
        steps: [
          'Deconstruct requirement into API interfaces and persistence schemas',
          'Spawn parallel subagents for Frontend component and Backend service',
          'Run automated invariant checks against Supabase security rules',
          'Synthesize pull request diff and await human approval in Command Center'
        ],
        affected_files: ['src/services/engine.ts', 'src/components/FeatureView.tsx'],
        estimated_tokens: 58000,
        subagents: ['Frontend UI Subagent', 'Backend Service Subagent', 'Security Verifier']
      },
      steps: [
        {
          step_number: 1,
          step_type: 'planning',
          content: `Architected modular subsystem according to enterprise guidelines. Drafted data contracts and idempotent API methods.`,
          model: 'gemini-3.5-flash',
          provider: 'google',
          tokens_in: 14000,
          tokens_out: 1900
        },
        {
          step_number: 2,
          step_type: 'coding',
          content: `Generated production-ready code files with strict TypeScript typing, error handling, and audit logging.`,
          model: 'gemini-3.5-flash',
          provider: 'google',
          tokens_in: 22000,
          tokens_out: 4100,
          diff: `+ export async function executeOperation(params: ServiceParams): Promise<Result> {
+   const lock = await acquireAdvisoryLock(params.id);
+   try {
+     return await runTransaction(params);
+   } finally {
+     await releaseAdvisoryLock(lock);
+   }
+ }`
        },
        {
          step_number: 3,
          step_type: 'testing',
          content: `Automated test suite executed. Zero memory leaks detected; benchmark latency settled within 140ms.`,
          model: 'gemini-3.5-flash',
          provider: 'google',
          tokens_in: 11000,
          tokens_out: 1300
        },
        {
          step_number: 4,
          step_type: 'verification',
          content: `Cross-model verification completed. Code is clean, well-typed, and ready for human operator review and merge.`,
          model: 'claude-sonnet-4',
          provider: 'anthropic',
          tokens_in: 7800,
          tokens_out: 950
        }
      ]
    };
  }
}
