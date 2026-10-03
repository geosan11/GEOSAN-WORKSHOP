import React from 'react';
import { TaskType } from './types';
import {
  GeminiLogo,
  DeepSeekLogo,
  KimiLogo,
  GrokLogo,
  ClaudeLogo,
  OpenAILogo
} from '../components/ServiceLogos';

export type TaskImportance = 'critical' | 'high' | 'standard' | 'high_context' | 'realtime';

export interface ImportanceOption {
  level: TaskImportance;
  label: string;
  badge: string;
  color: string;
  border: string;
  bg: string;
  description: string;
  example: string;
}

export const IMPORTANCE_LEVELS: ImportanceOption[] = [
  {
    level: 'critical',
    label: 'Critical (P0)',
    badge: 'ZERO RISK TOLERANCE',
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-950/30',
    description: 'Security audits, financial ledger settlement, RLS leaks, or production outages',
    example: 'Debt settlement rounding bug, OWASP RLS penetration crawl'
  },
  {
    level: 'high',
    label: 'High (P1)',
    badge: 'CORE ARCHITECTURE',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/30',
    description: 'Complex multi-file refactors, schema migrations, cross-service APIs',
    example: 'Offline SQLite sync engine, multi-currency webhook gateway'
  },
  {
    level: 'standard',
    label: 'Standard (P2)',
    badge: 'BUDGET OPTIMIZED',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/30',
    description: 'Routine feature implementations, UI component fixes, regression tests',
    example: 'Customer ledger badge, PDF export formatting, button states'
  },
  {
    level: 'high_context',
    label: 'High Context (P3)',
    badge: '100k - 1M TOKENS',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/30',
    description: 'Cross-repo dependency indexing, monolithic codebases, large spec docs',
    example: 'Index entire backend tree, FAA Part 121 compliance audit corpus'
  },
  {
    level: 'realtime',
    label: 'Real-Time Edge (P4)',
    badge: 'MINIMAL LATENCY',
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/30',
    description: 'Live telemetry triage, synthetic heartbeat monitoring, anomaly alarms',
    example: 'MQTT weigh-bridge latency spike, edge node error cluster'
  }
];

export interface ModelProfile {
  id: string;
  name: string;
  provider: 'Google' | 'DeepSeek' | 'Moonshot AI' | 'Anthropic' | 'xAI' | 'OpenAI';
  providerKey: 'google' | 'deepseek' | 'kimi' | 'anthropic' | 'xai' | 'openai';
  logo: React.FC<{ className?: string; size?: number }>;
  contextWindow: string;
  costInPerM: number;
  costOutPerM: number;
  reasoningPower: 'Maximum' | 'High' | 'Standard' | 'Fast';
  specialty: string;
  bestFor: string;
  tier: 'reasoning' | 'general' | 'economy' | 'long_context' | 'realtime';
}

export const PLATFORM_MODELS: ModelProfile[] = [
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    providerKey: 'deepseek',
    logo: DeepSeekLogo,
    contextWindow: '128k',
    costInPerM: 0.55,
    costOutPerM: 2.19,
    reasoningPower: 'Maximum',
    specialty: 'Formal Math & Invariant Logic',
    bestFor: 'Mathematical ledger proofs, security boundaries, RLS penetration audits',
    tier: 'reasoning'
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    logo: ClaudeLogo,
    contextWindow: '200k',
    costInPerM: 3.00,
    costOutPerM: 15.00,
    reasoningPower: 'Maximum',
    specialty: 'Hybrid Thinking & Architecture',
    bestFor: 'Complex architectural refactoring, subtle bug isolation, review signoff',
    tier: 'reasoning'
  },
  {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'OpenAI',
    providerKey: 'openai',
    logo: OpenAILogo,
    contextWindow: '200k',
    costInPerM: 1.10,
    costOutPerM: 4.40,
    reasoningPower: 'High',
    specialty: 'Deterministic Verification',
    bestFor: 'Deterministic invariant tests, SQL constraint checking, contract proofs',
    tier: 'reasoning'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    providerKey: 'deepseek',
    logo: DeepSeekLogo,
    contextWindow: '64k',
    costInPerM: 0.14,
    costOutPerM: 0.28,
    reasoningPower: 'High',
    specialty: 'Ultra-Low Cost High-Throughput Code',
    bestFor: 'Standard feature builds, rapid bug fixes, high-throughput code synthesis',
    tier: 'economy'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Google',
    providerKey: 'google',
    logo: GeminiLogo,
    contextWindow: '1M',
    costInPerM: 0.15,
    costOutPerM: 0.60,
    reasoningPower: 'High',
    specialty: '1M Context Orchestrator',
    bestFor: 'DOM QA crawls, multi-agent coordination, high-throughput tool calls',
    tier: 'general'
  },
  {
    id: 'kimi-k1.5',
    name: 'Moonshot Kimi K1.5',
    provider: 'Moonshot AI',
    providerKey: 'kimi',
    logo: KimiLogo,
    contextWindow: '256k',
    costInPerM: 0.60,
    costOutPerM: 2.40,
    reasoningPower: 'High',
    specialty: 'Massive Context Architecture',
    bestFor: 'Multi-repo cross-indexing, whole-system documentation crawl',
    tier: 'long_context'
  },
  {
    id: 'grok-4',
    name: 'xAI Grok 4',
    provider: 'xAI',
    providerKey: 'xai',
    logo: GrokLogo,
    contextWindow: '128k',
    costInPerM: 2.00,
    costOutPerM: 10.00,
    reasoningPower: 'High',
    specialty: 'Real-time Telemetry & Anomaly Search',
    bestFor: 'Real-time operational anomaly detection, edge triage, live diagnostics',
    tier: 'realtime'
  }
];

export interface ModelRecommendation {
  modelId: string;
  model: ModelProfile;
  rationale: string;
  ruleCategory: string;
  alternativeModelId: string;
  estimatedCostFactor: string;
}

export interface ModelSuitability {
  status: 'optimal' | 'suitable' | 'overkill' | 'underpowered';
  badge: string;
  badgeClass: string;
  message: string;
}

/**
 * Intelligent Router: Deterministically determines the optimal foundation model
 * based on the exact task type and business criticality level.
 */
export function getRecommendedModel(
  taskType: TaskType,
  importance: TaskImportance
): ModelRecommendation {
  // RULE 1: Critical Security / RBAC
  if (taskType === 'QA_SECURITY' || importance === 'critical') {
    const model = PLATFORM_MODELS.find((m) => m.id === 'deepseek-r1')!;
    return {
      modelId: 'deepseek-r1',
      model,
      ruleCategory: 'Zero-Defect Reasoning',
      rationale:
        'P0 Critical invariants and security boundaries require formal reasoning to detect authorization bypasses, multi-tenant leaks, and subtle logical flaws.',
      alternativeModelId: 'claude-3-7-sonnet',
      estimatedCostFactor: '$0.55/1M in (Deep reasoning at 80% discount vs competitors)'
    };
  }

  // RULE 2: Massive Context / Dependency Indexing
  if (importance === 'high_context') {
    const model = PLATFORM_MODELS.find((m) => m.id === 'kimi-k1.5')!;
    return {
      modelId: 'kimi-k1.5',
      model,
      ruleCategory: 'Massive 256k Context Window',
      rationale:
        'Cross-repository indexing and multi-file dependency trees require long-context window to avoid prompt truncation.',
      alternativeModelId: 'gemini-3.5-flash',
      estimatedCostFactor: '$0.60/1M in (Full repo tree ingested in single pass)'
    };
  }

  // RULE 3: Real-Time Edge Telemetry / Monitoring
  if (importance === 'realtime') {
    const model = PLATFORM_MODELS.find((m) => m.id === 'grok-4')!;
    return {
      modelId: 'grok-4',
      model,
      ruleCategory: 'Real-Time Edge Triage',
      rationale:
        'Real-time operational log monitoring and anomaly classification require low-latency live reasoning.',
      alternativeModelId: 'gemini-3.5-flash',
      estimatedCostFactor: '$2.00/1M in (Live search & telemetry triage)'
    };
  }

  // RULE 4: High Importance Feature / Complex Refactor
  if (importance === 'high') {
    const model = PLATFORM_MODELS.find((m) => m.id === 'claude-3-7-sonnet')!;
    return {
      modelId: 'claude-3-7-sonnet',
      model,
      ruleCategory: 'Architectural Hybrid Thinking',
      rationale:
        'Complex architectural features spanning multiple modules benefit from Claude 3.7 Sonnet’s extended thinking and deep refactoring precision.',
      alternativeModelId: 'deepseek-r1',
      estimatedCostFactor: '$3.00/1M in (Maximum code quality for flagship features)'
    };
  }

  // RULE 5: Autonomous QA Exploration (High Throughput)
  if (taskType === 'QA_EXPLORE' || taskType === 'QA_TARGETED') {
    const model = PLATFORM_MODELS.find((m) => m.id === 'gemini-3.5-flash')!;
    return {
      modelId: 'gemini-3.5-flash',
      model,
      ruleCategory: 'High-Throughput QA Crawl',
      rationale:
        'Autonomous DOM exploration and UI swipe tests require low latency and high token throughput with 1M context support.',
      alternativeModelId: 'deepseek-v3',
      estimatedCostFactor: '$0.15/1M in (High-speed automated subagent crawl)'
    };
  }

  // RULE 6: Standard Routine Coding & Bug Fixes (Default)
  const defaultModel = PLATFORM_MODELS.find((m) => m.id === 'deepseek-v3')!;
  return {
    modelId: 'deepseek-v3',
    model: defaultModel,
    ruleCategory: 'Budget-Optimized Synthesis',
    rationale:
      'Standard feature additions and routine bug fixes achieve state-of-the-art results at $0.14/1M tokens, maximizing budget runway.',
    alternativeModelId: 'gemini-3.5-flash',
    estimatedCostFactor: '$0.14/1M in (95% cost reduction vs flagship models)'
  };
}

/**
 * Assesses whether a selected model is optimal, overkill, or underpowered
 * for the given task and criticality level.
 */
export function getModelSuitability(
  selectedModelId: string,
  taskType: TaskType,
  importance: TaskImportance
): ModelSuitability {
  const rec = getRecommendedModel(taskType, importance);

  if (selectedModelId === rec.modelId) {
    return {
      status: 'optimal',
      badge: 'OPTIMAL MATCH',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
      message: 'Optimal choice: Perfectly matches the reasoning requirements and budget tier.'
    };
  }

  if (selectedModelId === rec.alternativeModelId) {
    return {
      status: 'suitable',
      badge: 'STRONG ALTERNATIVE',
      badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      message: 'Strong secondary alternative with matching capability profile.'
    };
  }

  // Check for underpowered selection on Critical/Security tasks
  if (
    (importance === 'critical' || taskType === 'QA_SECURITY') &&
    (selectedModelId === 'deepseek-v3' || selectedModelId === 'gemini-3.5-flash')
  ) {
    return {
      status: 'underpowered',
      badge: 'RISK: INSUFFICIENT REASONING',
      badgeClass: 'bg-red-950/60 text-red-300 border-red-500/40',
      message:
        'Warning: Critical financial or security tasks require deep chain-of-thought verification (DeepSeek R1 or Claude 3.7 Sonnet) to prevent edge-case failures.'
    };
  }

  // Check for overkill selection on Standard/Low tasks
  if (
    (importance === 'standard' || taskType === 'BUILD_FEATURE') &&
    (selectedModelId === 'claude-3-7-sonnet' || selectedModelId === 'grok-4')
  ) {
    return {
      status: 'overkill',
      badge: 'BUDGET WARNING: OVERKILL',
      badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      message:
        'Notice: This standard task can be resolved with DeepSeek V3 at $0.14/1M tokens, saving ~95% in token budget.'
    };
  }

  return {
    status: 'suitable',
    badge: 'ACCEPTABLE',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    message: 'Capable of handling this task mode.'
  };
}
