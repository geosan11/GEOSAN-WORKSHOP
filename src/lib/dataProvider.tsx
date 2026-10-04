import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Project,
  AgentTask,
  CostEvent,
  QARun,
  QAFinding,
  ProjectBudget,
  PromptVersion,
  TaskType,
  Conversation,
  ChatMessage
} from './types';
import {
  MOCK_PROJECTS,
  MOCK_TASKS,
  MOCK_COST_EVENTS,
  MOCK_QA_RUNS,
  MOCK_QA_FINDINGS,
  MOCK_PROJECT_BUDGETS,
  MOCK_PROMPT_VERSIONS,
  MOCK_CONVERSATIONS,
  MOCK_CHAT_MESSAGES
} from './mockData';
import { DEMO_SESSION_TASKS } from '../data/sessionFixtures';
import { supabase, isDemoMode } from './supabase';

export interface IDataProvider {
  isDemo: boolean;
  getProjects: () => Promise<Project[]>;
  getTasks: (projectId?: string) => Promise<AgentTask[]>;
  getCostEvents: (projectId?: string) => Promise<CostEvent[]>;
  getQARuns: (projectId?: string) => Promise<QARun[]>;
  getQAFindings: (runId?: string) => Promise<QAFinding[]>;
  getProjectBudgets: () => Promise<ProjectBudget[]>;
  getPromptVersions: () => Promise<PromptVersion[]>;
  getConversations: (projectId?: string) => Promise<Conversation[]>;
  getChatMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (conversationId: string, content: string, projectId: string) => Promise<ChatMessage>;
  confirmProposedTask: (taskId: string) => Promise<void>;
  dismissProposedTask: (taskId: string) => Promise<void>;
  createTask: (params: {
    org_id: string;
    project_id: string;
    task_type: TaskType;
    prompt: string;
    parent_task_id?: string | null;
  }) => Promise<AgentTask>;
  approveTask: (taskId: string) => Promise<void>;
  rejectTask: (taskId: string, reason: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<AgentTask>;
  resolveFinding: (findingId: string) => Promise<void>;
  updateBudget: (projectId: string, limitUsd: number, alertPct: number, hardStop: boolean) => Promise<void>;
  createProject: (params: {
    name: string;
    vertical: string;
    monthly_budget_usd?: number;
    repo_url?: string | null;
    agent_instructions?: string;
  }) => Promise<Project>;
  clearAllData: () => Promise<void>;
  subscribeChange: (listener: () => void) => () => void;
}

// ── In-Memory / Local Storage Clean Data Provider ──────────────────
class MockDataProvider implements IDataProvider {
  public isDemo = true;
  private projects: Project[] = typeof window === 'undefined' ? [...MOCK_PROJECTS] : [];
  private tasks: AgentTask[] = typeof window === 'undefined' ? [...DEMO_SESSION_TASKS] : [];
  private costEvents: CostEvent[] = [];
  private qaRuns: QARun[] = [];
  private qaFindings: QAFinding[] = [];
  private budgets: ProjectBudget[] = typeof window === 'undefined' ? [...MOCK_PROJECT_BUDGETS] : [];
  private promptVersions: PromptVersion[] = typeof window === 'undefined' ? [...MOCK_PROMPT_VERSIONS] : [];
  private conversations: Conversation[] = [];
  private chatMessages: ChatMessage[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    // In Node test harness, use MOCK_PROJECTS for deterministic test assertions
    if (typeof window === 'undefined') {
      this.projects = [...MOCK_PROJECTS];
      this.tasks = [...DEMO_SESSION_TASKS];
      this.budgets = [...MOCK_PROJECT_BUDGETS];
      this.promptVersions = [...MOCK_PROMPT_VERSIONS];
      return;
    }

    if (typeof localStorage === 'undefined') return;

    try {
      // In Browser: User workspace starts completely clean with zero mock projects
      const savedProjects = localStorage.getItem('geosan_projects');
      if (savedProjects) {
        const parsed = JSON.parse(savedProjects);
        this.projects = Array.isArray(parsed) ? parsed : [];
      } else {
        // Zero mock projects: user hasn't added or created any project yet
        this.projects = [];
        // Clean out any legacy mock data from previous sessions
        localStorage.removeItem('aetherorch_custom_projects');
        localStorage.removeItem('aetherorch_tasks');
        localStorage.removeItem('aetherorch_costs');
        localStorage.removeItem('aetherorch_qa_runs');
        localStorage.removeItem('aetherorch_qa_findings');
        localStorage.removeItem('aetherorch_chat_messages');
      }

      const savedTasks = localStorage.getItem('geosan_tasks');
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          this.tasks = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.tasks = [];
        }
      } else {
        this.tasks = [];
      }

      const savedCosts = localStorage.getItem('geosan_costs');
      if (savedCosts) {
        try {
          const parsed = JSON.parse(savedCosts);
          this.costEvents = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.costEvents = [];
        }
      } else {
        this.costEvents = [];
      }

      const savedRuns = localStorage.getItem('geosan_qa_runs');
      if (savedRuns) {
        try {
          const parsed = JSON.parse(savedRuns);
          this.qaRuns = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.qaRuns = [];
        }
      } else {
        this.qaRuns = [];
      }

      const savedFindings = localStorage.getItem('geosan_qa_findings');
      if (savedFindings) {
        try {
          const parsed = JSON.parse(savedFindings);
          this.qaFindings = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.qaFindings = [];
        }
      } else {
        this.qaFindings = [];
      }

      const savedMsgs = localStorage.getItem('geosan_chat_messages');
      if (savedMsgs) {
        try {
          const parsed = JSON.parse(savedMsgs);
          this.chatMessages = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.chatMessages = [];
        }
      } else {
        this.chatMessages = [];
      }
    } catch {
      this.projects = [];
      this.tasks = [];
      this.costEvents = [];
      this.qaRuns = [];
      this.qaFindings = [];
    }
  }

  private saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('geosan_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('geosan_costs', JSON.stringify(this.costEvents));
      localStorage.setItem('geosan_qa_runs', JSON.stringify(this.qaRuns));
      localStorage.setItem('geosan_qa_findings', JSON.stringify(this.qaFindings));
      localStorage.setItem('geosan_chat_messages', JSON.stringify(this.chatMessages));
      localStorage.setItem('geosan_projects', JSON.stringify(this.projects));
    } catch {}
  }

  public async clearAllData(): Promise<void> {
    this.projects = typeof window === 'undefined' ? [...MOCK_PROJECTS] : [];
    this.tasks = [];
    this.costEvents = [];
    this.qaRuns = [];
    this.qaFindings = [];
    this.conversations = [];
    this.chatMessages = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('geosan_projects');
      localStorage.removeItem('geosan_tasks');
      localStorage.removeItem('geosan_costs');
      localStorage.removeItem('geosan_qa_runs');
      localStorage.removeItem('geosan_qa_findings');
      localStorage.removeItem('geosan_chat_messages');
      localStorage.removeItem('aetherorch_custom_projects');
      localStorage.removeItem('aetherorch_tasks');
      localStorage.removeItem('aetherorch_costs');
      localStorage.removeItem('aetherorch_qa_runs');
      localStorage.removeItem('aetherorch_qa_findings');
      localStorage.removeItem('aetherorch_chat_messages');
    }
    this.notify();
  }

  public async createProject(params: {
    name: string;
    vertical: string;
    monthly_budget_usd?: number;
    repo_url?: string | null;
    agent_instructions?: string;
  }): Promise<Project> {
    const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `proj-${slug || Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newProject: Project = {
      id,
      org_id: 'org-ehi-global',
      name: params.name.trim(),
      slug: slug || 'custom-project',
      vertical: params.vertical || 'fintech',
      repo_url: params.repo_url || null,
      vercel_deployment_url: null,
      status: 'planning',
      created_at: nowIso,
      updated_at: nowIso,
      monthly_budget_usd: params.monthly_budget_usd || 1000,
      health_status: 'healthy',
      uptime_pct: 100.0,
      agent_instructions: params.agent_instructions || `Autonomous orchestrator build guidelines for ${params.name.trim()}`,
      last_activity_at: nowIso,
      git_branch: 'main'
    };

    this.projects.unshift(newProject);
    this.budgets.push({
      project_id: id,
      monthly_limit_usd: params.monthly_budget_usd || 1000,
      alert_threshold_pct: 80,
      hard_stop: true
    });

    if (typeof localStorage !== 'undefined') {
      try {
        const customOnly = this.projects.filter(p => !MOCK_PROJECTS.some(mp => mp.id === p.id));
        localStorage.setItem('aetherorch_custom_projects', JSON.stringify(customOnly));
      } catch {}
    }

    this.notify();
    return newProject;
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public subscribeChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getConversations(projectId?: string): Promise<Conversation[]> {
    if (projectId) {
      let found = this.conversations.filter((c) => c.project_id === projectId && !c.archived);
      if (found.length === 0) {
        // Auto-create initial project conversation
        const proj = this.projects.find((p) => p.id === projectId);
        const newConv: Conversation = {
          id: `conv-${projectId}-${Date.now()}`,
          org_id: proj?.org_id || 'org-ehi-global',
          project_id: projectId,
          title: `${proj?.name || 'Project'} Operational Collaborator`,
          adk_session_id: `adk-sess-${Date.now()}`,
          last_message_at: new Date().toISOString(),
          message_count: 0,
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.conversations.push(newConv);
        found = [newConv];
      }
      return [...found];
    }
    return [...this.conversations];
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.chatMessages.filter((m) => m.conversation_id === conversationId);
  }

  async sendMessage(conversationId: string, content: string, projectId: string): Promise<ChatMessage> {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString()
    };
    this.chatMessages.push(userMsg);
    this.notify();

    // Simulate ProjectChatAgent response in background (1s)
    setTimeout(() => {
      const proj = this.projects.find((p) => p.id === projectId);
      const projTasks = this.tasks.filter((t) => t.project_id === projectId);
      const projFindings = this.qaFindings.filter((f) => {
        const run = this.qaRuns.find((r) => r.id === f.run_id);
        return run?.project_id === projectId && f.status !== 'resolved';
      });

      const lower = content.toLowerCase();
      let reply = '';
      let proposedTaskId: string | null = null;
      let toolCalls: Record<string, unknown>[] = [];

      if (lower.includes('health') || lower.includes('broke') || lower.includes('status') || lower.includes('overnight')) {
        toolCalls = [{ name: 'get_project_summary', args: { project_id: projectId } }];
        reply = `${proj?.name} is running in ${proj?.status} status with ${proj?.uptime_pct || 99.9}% uptime. ` +
          `We have ${projTasks.filter((t) => t.status === 'running').length} task actively running and ${projFindings.length} open QA finding(s). ` +
          `No system crashes occurred in the last 24 hours.`;
      } else if (lower.includes('cost') || lower.includes('spend') || lower.includes('budget')) {
        toolCalls = [{ name: 'get_cost_summary', args: { project_id: projectId, days: 30 } }];
        const currentSpend = this.costEvents
          .filter((e) => e.project_id === projectId)
          .reduce((sum, e) => sum + e.cost_usd, 0);
        reply = `Month-to-date spend for ${proj?.name} is $${currentSpend.toFixed(2)} against the $${proj?.monthly_budget_usd || 1000} monthly limit (${Math.round((currentSpend / (proj?.monthly_budget_usd || 1000)) * 100)}% consumed). Hard-stop protections are actively monitored.`;
      } else if (lower.includes('bug') || lower.includes('qa') || lower.includes('finding')) {
        toolCalls = [{ name: 'get_open_findings', args: { project_id: projectId } }];
        reply = `Currently tracking ${projFindings.length} open QA finding(s) for ${proj?.name}. Most notable: "${projFindings[0]?.title || 'None'}". I can formulate a targeted regression fix task if you wish.`;
      } else {
        // Propose a task pattern (Addendum Artifact 7)
        toolCalls = [
          {
            name: 'propose_task',
            args: {
              project_id: projectId,
              task_type: 'BUILD_FEATURE',
              prompt: content,
              rationale: 'Discussed improvement formulated from operator chat'
            }
          }
        ];
        const newTaskId = `task-prop-${Date.now()}`;
        proposedTaskId = newTaskId;
        const proposedTask: AgentTask = {
          id: newTaskId,
          org_id: proj?.org_id || 'org-ehi-global',
          project_id: projectId,
          parent_task_id: null,
          task_type: lower.includes('fix') ? 'FIX_BUG' : 'BUILD_FEATURE',
          prompt: content.trim(),
          status: 'proposed',
          assigned_agent: null,
          plan: {
            summary: `Automated plan for: ${content}`,
            rationale: 'Proposed by ProjectChatAgent based on operator conversation'
          },
          result: null,
          branch_name: null,
          pr_url: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null
        };
        this.tasks.unshift(proposedTask);

        reply = `I have analyzed this idea for ${proj?.name}. It would fit cleanly into our architecture without breaking existing invariants. I've drafted a proposed task card below. Please review and click "Confirm & Dispatch" if you want me to hand it off to the Coordinator.`;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
        proposed_task_id: proposedTaskId,
        tool_calls: toolCalls,
        model_used: 'gemini-3.5-flash',
        tokens_input: 1650,
        tokens_output: 280,
        cost_usd: 0.0021,
        created_at: new Date().toISOString()
      };
      this.chatMessages.push(assistantMsg);

      // Add cost event for chat turn
      this.costEvents.unshift({
        id: `cost-chat-${Date.now()}`,
        org_id: proj?.org_id || 'org-ehi-global',
        project_id: projectId,
        task_id: null,
        provider: 'google',
        model: 'gemini-3.5-flash',
        tokens_input: 1650,
        tokens_output: 280,
        cost_usd: 0.0021,
        attributed_to: `CHAT:${conversationId.slice(0, 16)}`,
        created_at: new Date().toISOString()
      });

      this.notify();
    }, 1000);

    return userMsg;
  }

  async confirmProposedTask(taskId: string): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.tasks[idx] = {
        ...this.tasks[idx],
        status: 'queued'
      };
      this.notify();
    }
  }

  async dismissProposedTask(taskId: string): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.tasks[idx] = {
        ...this.tasks[idx],
        status: 'cancelled',
        result: { dismissed: true }
      };
      this.notify();
    }
  }

  async getProjects(): Promise<Project[]> {
    return [...this.projects];
  }

  async getTasks(projectId?: string): Promise<AgentTask[]> {
    if (projectId) {
      return this.tasks.filter((t) => t.project_id === projectId);
    }
    return [...this.tasks];
  }

  async getCostEvents(projectId?: string): Promise<CostEvent[]> {
    if (projectId) {
      return this.costEvents.filter((c) => c.project_id === projectId);
    }
    return [...this.costEvents];
  }

  async getQARuns(projectId?: string): Promise<QARun[]> {
    if (projectId) {
      return this.qaRuns.filter((q) => q.project_id === projectId);
    }
    return [...this.qaRuns];
  }

  async getQAFindings(runId?: string): Promise<QAFinding[]> {
    if (runId) {
      return this.qaFindings.filter((f) => f.run_id === runId);
    }
    return [...this.qaFindings];
  }

  async getProjectBudgets(): Promise<ProjectBudget[]> {
    return [...this.budgets];
  }

  async getPromptVersions(): Promise<PromptVersion[]> {
    return [...this.promptVersions];
  }

  async createTask(params: {
    org_id: string;
    project_id: string;
    task_type: TaskType;
    prompt: string;
    parent_task_id?: string | null;
  }): Promise<AgentTask> {
    const newTask: AgentTask = {
      id: `task-${Date.now()}`,
      org_id: params.org_id,
      project_id: params.project_id,
      parent_task_id: params.parent_task_id || null,
      task_type: params.task_type,
      prompt: params.prompt,
      status: 'queued',
      assigned_agent: null,
      plan: null,
      result: null,
      branch_name: null,
      pr_url: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null
    };
    this.tasks = [newTask, ...this.tasks];

    // Simulate coordinator taking task after 2s
    setTimeout(() => {
      const idx = this.tasks.findIndex((t) => t.id === newTask.id);
      if (idx >= 0 && this.tasks[idx].status === 'queued') {
        this.tasks[idx] = {
          ...this.tasks[idx],
          status: 'running',
          assigned_agent:
            newTask.task_type === 'BUILD_FEATURE' || newTask.task_type === 'FIX_BUG'
              ? 'CodingAgent'
              : newTask.task_type.startsWith('QA_')
              ? 'QAAgent'
              : 'CoordinatorAgent',
          started_at: new Date().toISOString(),
          plan: {
            summary: `Automated plan for: ${newTask.prompt}. Verifying repo AST and isolation boundaries.`,
            files_to_modify: ['src/index.ts', 'src/components/Main.tsx']
          }
        };
        // Add a cost event
        this.costEvents = [
          {
            id: `cost-${Date.now()}`,
            org_id: newTask.org_id,
            project_id: newTask.project_id,
            task_id: newTask.id,
            provider: 'google',
            model: 'gemini-3.5-flash',
            tokens_input: 14200,
            tokens_output: 1900,
            cost_usd: 0.0163,
            attributed_to: `${newTask.task_type}:${newTask.prompt.slice(0, 24).toLowerCase().replace(/\s+/g, '-')}`,
            created_at: new Date().toISOString()
          },
          ...this.costEvents
        ];
        this.notify();

        // If it's a feature, transition to awaiting_approval after another 3s
        if (newTask.task_type === 'BUILD_FEATURE' || newTask.task_type === 'FIX_BUG') {
          setTimeout(() => {
            const pIdx = this.tasks.findIndex((t) => t.id === newTask.id);
            if (pIdx >= 0 && this.tasks[pIdx].status === 'running') {
              this.tasks[pIdx] = {
                ...this.tasks[pIdx],
                status: 'awaiting_approval',
                result: {
                  summary: 'Code changes planned and verified by ReviewAgent. Ready for operator approval.',
                  diff_stat: '+48 -12 lines'
                },
                branch_name: `agent/${newTask.id}`,
                pr_url: `https://github.com/ehi-enterprise/ledger-core/pull/${Math.floor(Math.random() * 800) + 100}`
              };
              this.notify();
            }
          }, 3000);
        }
      }
    }, 2000);

    this.notify();
    return newTask;
  }

  async approveTask(taskId: string): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.tasks[idx] = {
        ...this.tasks[idx],
        status: 'running',
        started_at: this.tasks[idx].started_at || new Date().toISOString()
      };

      // Unblock dependent tasks (Addendum A3)
      this.tasks = this.tasks.map((t) => {
        if (t.parent_task_id === taskId && t.status === 'blocked') {
          return { ...t, status: 'queued' };
        }
        return t;
      });

      // Finish after 4 seconds
      setTimeout(() => {
        const finishIdx = this.tasks.findIndex((t) => t.id === taskId);
        if (finishIdx >= 0) {
          this.tasks[finishIdx] = {
            ...this.tasks[finishIdx],
            status: 'done',
            completed_at: new Date().toISOString()
          };
          this.notify();
        }
      }, 4000);

      this.notify();
    }
  }

  async rejectTask(taskId: string, reason: string): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.tasks[idx] = {
        ...this.tasks[idx],
        status: 'failed',
        result: {
          rejected: true,
          reason,
          rejected_at: new Date().toISOString()
        },
        completed_at: new Date().toISOString()
      };
      this.notify();
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.tasks[idx] = {
        ...this.tasks[idx],
        status: 'cancelled',
        completed_at: new Date().toISOString()
      };
      this.notify();
    }
  }

  async retryTask(taskId: string): Promise<AgentTask> {
    const original = this.tasks.find((t) => t.id === taskId);
    if (!original) throw new Error('Task not found');

    return this.createTask({
      org_id: original.org_id,
      project_id: original.project_id,
      task_type: original.task_type,
      prompt: original.prompt,
      parent_task_id: original.id
    });
  }

  async resolveFinding(findingId: string): Promise<void> {
    const idx = this.qaFindings.findIndex((f) => f.id === findingId);
    if (idx >= 0) {
      this.qaFindings[idx] = {
        ...this.qaFindings[idx],
        status: 'resolved'
      };
      this.notify();
    }
  }

  async updateBudget(projectId: string, limitUsd: number, alertPct: number, hardStop: boolean): Promise<void> {
    const idx = this.budgets.findIndex((b) => b.project_id === projectId);
    if (idx >= 0) {
      this.budgets[idx] = {
        ...this.budgets[idx],
        monthly_limit_usd: limitUsd,
        alert_threshold_pct: alertPct,
        hard_stop: hardStop
      };
    } else {
      this.budgets.push({
        project_id: projectId,
        monthly_limit_usd: limitUsd,
        alert_threshold_pct: alertPct,
        hard_stop: hardStop
      });
    }
    this.notify();
  }
}

// ── Real Supabase Data Provider ──────────────────────────────────
class SupabaseDataProvider implements IDataProvider {
  public isDemo = false;
  private listeners: Set<() => void> = new Set();

  public subscribeChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async getProjects(): Promise<Project[]> {
    if (!supabase) return typeof window === 'undefined' ? (MOCK_PROJECTS as Project[]) : [];
    try {
      const { data, error } = await supabase.from('project_registry').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Project[];
      }
    } catch {}
    return typeof window === 'undefined' ? (MOCK_PROJECTS as Project[]) : [];
  }

  async getTasks(projectId?: string): Promise<AgentTask[]> {
    if (!supabase) return typeof window === 'undefined' ? (MOCK_TASKS as AgentTask[]) : [];
    try {
      let query = supabase.from('agent_tasks').select('*').order('created_at', { ascending: false });
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as AgentTask[];
      }
    } catch {}
    return typeof window === 'undefined' ? ((projectId ? MOCK_TASKS.filter((t: AgentTask) => t.project_id === projectId) : MOCK_TASKS) as AgentTask[]) : [];
  }

  async getCostEvents(projectId?: string): Promise<CostEvent[]> {
    if (!supabase) return typeof window === 'undefined' ? (MOCK_COST_EVENTS as CostEvent[]) : [];
    try {
      let query = supabase.from('cost_events').select('*').order('created_at', { ascending: false });
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as CostEvent[];
      }
    } catch {}
    return typeof window === 'undefined' ? ((projectId ? MOCK_COST_EVENTS.filter((c: CostEvent) => c.project_id === projectId) : MOCK_COST_EVENTS) as CostEvent[]) : [];
  }

  async getQARuns(projectId?: string): Promise<QARun[]> {
    if (!supabase) return typeof window === 'undefined' ? (MOCK_QA_RUNS as QARun[]) : [];
    try {
      let query = supabase.from('qa_runs').select('*').order('created_at', { ascending: false });
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as QARun[];
      }
    } catch {}
    return typeof window === 'undefined' ? ((projectId ? MOCK_QA_RUNS.filter((r: QARun) => r.project_id === projectId) : MOCK_QA_RUNS) as QARun[]) : [];
  }

  async getQAFindings(runId?: string): Promise<QAFinding[]> {
    if (!supabase) return typeof window === 'undefined' ? (MOCK_QA_FINDINGS as QAFinding[]) : [];
    try {
      let query = supabase.from('qa_findings').select('*').order('created_at', { ascending: false });
      if (runId) {
        query = query.eq('run_id', runId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as QAFinding[];
      }
    } catch {}
    return typeof window === 'undefined' ? ((runId ? MOCK_QA_FINDINGS.filter((f: QAFinding) => f.run_id === runId) : MOCK_QA_FINDINGS) as QAFinding[]) : [];
  }

  async getProjectBudgets(): Promise<ProjectBudget[]> {
    if (!supabase) return typeof window === 'undefined' ? MOCK_PROJECTS.map((p: Project) => ({ project_id: p.id, monthly_limit_usd: p.monthly_budget_usd || 1000, alert_threshold_pct: 80, hard_stop: true })) : [];
    try {
      const { data, error } = await supabase.from('project_budgets').select('*');
      if (!error && Array.isArray(data)) {
        return data as ProjectBudget[];
      }
    } catch {}
    return typeof window === 'undefined' ? MOCK_PROJECTS.map((p: Project) => ({ project_id: p.id, monthly_limit_usd: p.monthly_budget_usd || 1000, alert_threshold_pct: 80, hard_stop: true })) : [];
  }

  async getPromptVersions(): Promise<PromptVersion[]> {
    if (!supabase) return MOCK_PROMPT_VERSIONS as PromptVersion[];
    try {
      const { data, error } = await supabase.from('prompt_versions').select('*').order('version', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as PromptVersion[];
      }
    } catch {}
    return MOCK_PROMPT_VERSIONS as PromptVersion[];
  }

  async createTask(params: {
    org_id: string;
    project_id: string;
    task_type: TaskType;
    prompt: string;
    parent_task_id?: string | null;
  }): Promise<AgentTask> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({
        org_id: params.org_id,
        project_id: params.project_id,
        task_type: params.task_type,
        prompt: params.prompt,
        parent_task_id: params.parent_task_id || null,
        status: 'queued'
      })
      .select('*')
      .single();
    if (error) throw error;
    this.notify();
    return data as AgentTask;
  }

  async approveTask(taskId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;

    // Unblock dependent tasks
    const { data: deps } = await supabase
      .from('task_dependencies')
      .select('task_id')
      .eq('depends_on_task_id', taskId);

    for (const dep of deps || []) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'queued' })
        .eq('id', dep.task_id)
        .eq('status', 'blocked');
    }
    this.notify();
  }

  async rejectTask(taskId: string, reason: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('agent_tasks')
      .update({
        status: 'failed',
        result: { rejected: true, reason, rejected_at: new Date().toISOString() }
      })
      .eq('id', taskId);
    if (error) throw error;
    this.notify();
  }

  async cancelTask(taskId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status: 'cancelled' })
      .eq('id', taskId);
    if (error) throw error;
    this.notify();
  }

  async retryTask(taskId: string): Promise<AgentTask> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: original, error: origError } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    if (origError || !original) throw origError || new Error('Task not found');

    return this.createTask({
      org_id: original.org_id,
      project_id: original.project_id,
      task_type: original.task_type,
      prompt: original.prompt,
      parent_task_id: original.id
    });
  }

  async resolveFinding(findingId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('qa_findings')
      .update({ status: 'resolved' })
      .eq('id', findingId);
    if (error) throw error;
    this.notify();
  }

  async updateBudget(projectId: string, limitUsd: number, alertPct: number, hardStop: boolean): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('project_budgets')
      .upsert({
        project_id: projectId,
        monthly_limit_usd: limitUsd,
        alert_threshold_pct: alertPct,
        hard_stop: hardStop
      });
    if (error) throw error;
    this.notify();
  }

  async getConversations(projectId?: string): Promise<Conversation[]> {
    if (!supabase) return [];
    let query = supabase.from('conversations').select('*').order('last_message_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Conversation[];
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ChatMessage[];
  }

  async sendMessage(conversationId: string, content: string, _projectId: string): Promise<ChatMessage> {
    if (!supabase) throw new Error('Supabase not connected');
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: content.trim()
      })
      .select('*')
      .single();
    if (error) throw error;
    this.notify();
    return data as ChatMessage;
  }

  async confirmProposedTask(taskId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status: 'queued' })
      .eq('id', taskId);
    if (error) throw error;
    this.notify();
  }

  async dismissProposedTask(taskId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('agent_tasks')
      .update({ status: 'cancelled', result: { dismissed: true } })
      .eq('id', taskId);
    if (error) throw error;
    this.notify();
  }

  async createProject(params: {
    name: string;
    vertical: string;
    monthly_budget_usd?: number;
    repo_url?: string | null;
    agent_instructions?: string;
  }): Promise<Project> {
    const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `proj-${slug || Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const newProject: Project = {
      id,
      org_id: 'org-ehi-global',
      name: params.name.trim(),
      slug: slug || 'custom-project',
      vertical: params.vertical || 'fintech',
      repo_url: params.repo_url || null,
      vercel_deployment_url: null,
      status: 'planning',
      created_at: nowIso,
      updated_at: nowIso,
      monthly_budget_usd: params.monthly_budget_usd || 1000,
      health_status: 'healthy',
      uptime_pct: 100.0,
      agent_instructions: params.agent_instructions || `Autonomous orchestrator build guidelines for ${params.name.trim()}`,
      last_activity_at: nowIso,
      git_branch: 'main'
    };

    if (supabase) {
      try {
        await supabase.from('project_registry').insert(newProject);
      } catch {}
    }
    this.notify();
    return newProject;
  }

  async clearAllData(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('aetherorch_tasks');
      localStorage.removeItem('aetherorch_costs');
      localStorage.removeItem('aetherorch_qa_runs');
      localStorage.removeItem('aetherorch_qa_findings');
      localStorage.removeItem('aetherorch_chat_messages');
    }
    this.notify();
  }
}

// Instantiate singleton data provider
export const dataProviderInstance: IDataProvider = isDemoMode
  ? new MockDataProvider()
  : new SupabaseDataProvider();

const DataProviderContext = createContext<IDataProvider>(dataProviderInstance);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DataProviderContext.Provider value={dataProviderInstance}>
      {children}
    </DataProviderContext.Provider>
  );
};

export function useDataProvider(): IDataProvider {
  return useContext(DataProviderContext);
}
