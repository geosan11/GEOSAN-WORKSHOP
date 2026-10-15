/**
 * Steel-style session trace helpers for Runs detail.
 * Builds a timed event stream + metadata snapshot from an AgentTask,
 * preferring demo worklog fixtures when the task id matches.
 */

import { AgentTask } from './types';
import {
    DEMO_WORKLOG_APPROVAL,
    DEMO_WORKLOG_RUNNING,
    WorklogItem,
    WorklogType,
} from '../data/sessionFixtures';

export type SessionTraceKind = WorklogType | 'dispatch' | 'status' | 'navigate';

export interface SessionTraceEvent {
    id: string;
    at: string;
    kind: SessionTraceKind;
    label: string;
    detail?: string;
}

export interface SessionMetadata {
    sessionId: string;
    live: boolean;
    status: AgentTask['status'];
    taskType: AgentTask['task_type'];
    assignedAgent: string;
    costUsd: number;
    durationLabel: string;
    idleLabel: string;
    branch: string;
    prUrl: string | null;
    prompt: string;
    startedAt: string | null;
    createdAt: string;
    modelMode: string;
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function formatClock(iso: string | null | undefined, fallback: string): string {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fallback;
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function durationBetween(startIso: string | null, endIso: string | null): string {
    const start = startIso ? new Date(startIso).getTime() : NaN;
    const end = endIso ? new Date(endIso).getTime() : Date.now();
    if (Number.isNaN(start)) return '—';
    const sec = Math.max(0, Math.round((end - start) / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${pad2(s)}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${pad2(m % 60)}m`;
}

function worklogToEvents(items: WorklogItem[]): SessionTraceEvent[] {
    return items.map((item) => {
        let detail: string | undefined;
        if (item.type === 'shell' && item.payload?.command) {
            detail = item.payload.command;
        } else if (item.type === 'edit' && item.payload?.filePath) {
            detail = item.payload.filePath;
        } else if (item.type === 'qa' && item.payload?.finding) {
            detail = item.payload.finding.title;
        } else if (item.type === 'approval' && item.payload?.notes) {
            detail = item.payload.notes;
        } else if (item.type === 'plan' && item.payload?.steps) {
            detail = `${item.payload.steps.length} plan steps`;
        } else if (item.type === 'pr' && item.payload?.prUrl) {
            detail = item.payload.prUrl;
        }

        return {
            id: item.id,
            at: item.timestamp,
            kind: item.type,
            label: item.summary,
            detail,
        };
    });
}

function synthesizeEvents(task: AgentTask): SessionTraceEvent[] {
    const created = formatClock(task.created_at, '00:00:00');
    const started = formatClock(task.started_at, created);
    const events: SessionTraceEvent[] = [
        {
            id: `${task.id}-dispatch`,
            at: created,
            kind: 'dispatch',
            label: `Dispatch ${task.task_type}`,
            detail: task.prompt.slice(0, 120),
        },
    ];

    if (task.started_at) {
        events.push({
            id: `${task.id}-start`,
            at: started,
            kind: 'status',
            label: 'Session mounted',
            detail: task.assigned_agent || 'CoordinatorAgent',
        });
    }

    if (task.plan) {
        const summary =
            typeof task.plan.summary === 'string'
                ? task.plan.summary
                : 'Plan synthesis complete';
        events.push({
            id: `${task.id}-plan`,
            at: started,
            kind: 'plan',
            label: summary,
            detail: task.status === 'awaiting_approval' ? 'Waiting on operator approval' : undefined,
        });
    }

    if (task.branch_name) {
        events.push({
            id: `${task.id}-branch`,
            at: started,
            kind: 'shell',
            label: `Worktree opened · ${task.branch_name}`,
            detail: `git checkout -b ${task.branch_name}`,
        });
    }

    if (task.status === 'awaiting_approval') {
        events.push({
            id: `${task.id}-gate`,
            at: formatClock(task.started_at || task.created_at, started),
            kind: 'approval',
            label: 'Approval gate · write',
            detail: 'Read is silent. Approve opens the branch / PR path.',
        });
    }

    if (task.status === 'running') {
        events.push({
            id: `${task.id}-running`,
            at: started,
            kind: 'status',
            label: 'Specialist working in isolated worktree',
            detail: task.assigned_agent || 'CodingAgent',
        });
    }

    if (task.status === 'done') {
        events.push({
            id: `${task.id}-done`,
            at: formatClock(task.completed_at, started),
            kind: 'status',
            label: 'Run completed',
            detail: task.pr_url || 'No PR attached',
        });
    }

    if (task.pr_url) {
        events.push({
            id: `${task.id}-pr`,
            at: formatClock(task.completed_at || task.started_at, started),
            kind: 'pr',
            label: 'Pull request ready',
            detail: task.pr_url,
        });
    }

    return events;
}

export function getWorklogForTask(taskId: string): WorklogItem[] | null {
    if (taskId === 'task-session-running-01') return DEMO_WORKLOG_RUNNING;
    if (taskId === 'task-session-approval-02') return DEMO_WORKLOG_APPROVAL;
    return null;
}

export function buildSessionTraceEvents(task: AgentTask): SessionTraceEvent[] {
    const fixture = getWorklogForTask(task.id);
    if (fixture) return worklogToEvents(fixture);
    return synthesizeEvents(task);
}

export function buildSessionMetadata(task: AgentTask): SessionMetadata {
    // Steel "Live" means an active working session — queued is idle waiting.
    const live = task.status === 'running';
    const terminal =
        task.status === 'done' || task.status === 'failed' || task.status === 'cancelled';
    // Prefer completed_at for finished runs. For open runs, use last fixture
    // event clock when started_at is a stale demo timestamp (avoids multi-day durations).
    const endIso = terminal ? task.completed_at : null;
    let durationLabel = durationBetween(task.started_at || task.created_at, endIso);
    const startMs = new Date(task.started_at || task.created_at).getTime();
    const ageSec = Number.isNaN(startMs) ? 0 : Math.round((Date.now() - startMs) / 1000);
    // Demo fixtures use fixed 2026-10-04 timestamps — avoid multi-day "duration" labels.
    if (live && ageSec > 7200) {
        durationLabel = 'active';
    } else if (!terminal && !live && ageSec > 3600) {
        durationLabel = 'paused';
    }

    return {
        sessionId: task.id,
        live,
        status: task.status,
        taskType: task.task_type,
        assignedAgent: task.assigned_agent || 'CoordinatorAgent',
        costUsd: task.cost_usd ?? 0.0045,
        durationLabel,
        idleLabel: live ? 'live' : `${durationLabel} idle`,
        branch: task.branch_name || 'Not opened',
        prUrl: task.pr_url,
        prompt: task.prompt,
        startedAt: task.started_at,
        createdAt: task.created_at,
        modelMode: task.task_type.replace(/_/g, ' '),
    };
}

export function formatTraceAsPrompt(events: SessionTraceEvent[], meta: SessionMetadata): string {
    const lines = [
        `Session ${meta.sessionId}`,
        `Status: ${meta.status} · ${meta.modelMode} · ${meta.assignedAgent}`,
        `Cost: $${meta.costUsd.toFixed(4)} · Duration: ${meta.durationLabel}`,
        '',
        'Agent traces:',
        ...events.map((e) => `- ${e.kind} @ ${e.at} — ${e.label}${e.detail ? ` (${e.detail})` : ''}`),
    ];
    return lines.join('\n');
}
