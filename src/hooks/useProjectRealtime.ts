import { useEffect, useState, useCallback } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';

export interface ProjectLogItem {
  id: string;
  project_id: string;
  timestamp: string;
  agent: string;
  provider: string;
  actionType: string;
  level?: 'info' | 'error' | 'warn';
  message: string;
  payload?: Record<string, unknown>;
}

export interface AgentAssignmentItem {
  id: string;
  project_id: string;
  role: string;
  agent_name: string;
  provider: string;
  model: string;
  status: 'idle' | 'active' | 'running' | 'paused' | 'blocked' | 'completed' | 'error' | 'offline';
  is_primary?: boolean;
}

interface UseProjectRealtimeProps {
  projectId: string;
  initialLogs?: ProjectLogItem[];
  defaultAgents?: string[];
}

export function useProjectRealtime({
  projectId,
  initialLogs = [],
  defaultAgents = ['CoordinatorAgent', 'ReviewAgent']
}: UseProjectRealtimeProps) {
  const [logs, setLogs] = useState<ProjectLogItem[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`geosan_project_logs_${projectId}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return initialLogs;
  });

  const [activeAgents, setActiveAgents] = useState<string[]>(defaultAgents);
  const [agentsPaused, setAgentsPaused] = useState<boolean>(false);

  // Helper to persist and broadcast logs (demo + live sync)
  const appendLog = useCallback((item: ProjectLogItem) => {
    setLogs((prev) => {
      const updated = [item, ...prev];
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(`geosan_project_logs_${projectId}`, JSON.stringify(updated.slice(0, 100)));
          window.dispatchEvent(new CustomEvent('geosan_project_log_new', { detail: item }));
        } catch {}
      }
      return updated;
    });
  }, [projectId]);

  // Set agent assignment status (paused / working)
  const setAgentStatus = useCallback((paused: boolean) => {
    setAgentsPaused(paused);
    const newLog: ProjectLogItem = {
      id: `log-${Date.now()}`,
      project_id: projectId,
      timestamp: new Date().toLocaleTimeString(),
      agent: 'Supervisor',
      provider: 'local',
      actionType: 'STATUS_TOGGLE',
      level: 'info',
      message: paused
        ? 'Operator paused agent executions. agent_assignments status set to paused'
        : 'Operator resumed agent executions. agent_assignments status set to working',
      payload: {
        agent_assignments_status: paused ? 'paused' : 'working',
        project_id: projectId,
        updated_at: new Date().toISOString()
      }
    };
    appendLog(newLog);
  }, [projectId, appendLog]);

  useEffect(() => {
    // 1. Cross-tab & local custom event listener for in-memory / demo sync
    const handleLocalNewLog = (e: any) => {
      if (e.detail && e.detail.project_id === projectId) {
        setLogs((prev) => {
          if (prev.some((l) => l.id === e.detail.id)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `geosan_project_logs_${projectId}` && e.newValue) {
        try {
          setLogs(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('geosan_project_log_new', handleLocalNewLog);
    window.addEventListener('storage', handleStorage);

    // 2. Supabase Realtime Subscription (when configured)
    let channel: any = null;
    if (supabase && !isDemoMode) {
      try {
        channel = supabase
          .channel(`project_realtime:${projectId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'project_logs',
              filter: `project_id=eq.${projectId}`
            },
            (payload: any) => {
              if (payload?.new) {
                const row = payload.new;
                const formattedLog: ProjectLogItem = {
                  id: row.id || `log-${Date.now()}`,
                  project_id: row.project_id,
                  timestamp: row.created_at ? new Date(row.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
                  agent: row.agent_name || 'Agent',
                  provider: row.provider || 'anthropic',
                  actionType: row.action_type || row.event_type || 'log',
                  level: row.level || 'info',
                  message: row.message || '',
                  payload: row.payload || {}
                };
                setLogs((prev) => [formattedLog, ...prev.filter((l) => l.id !== formattedLog.id)]);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'agent_assignments',
              filter: `project_id=eq.${projectId}`
            },
            (payload: any) => {
              if (payload?.new) {
                const assignment: AgentAssignmentItem = payload.new;
                if (assignment.agent_name) {
                  setActiveAgents((prev) => {
                    const set = new Set(prev);
                    set.add(assignment.agent_name);
                    return Array.from(set);
                  });
                }
                if (assignment.status === 'paused') {
                  setAgentsPaused(true);
                } else if (assignment.status === 'active' || assignment.status === 'running') {
                  setAgentsPaused(false);
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription fallback to local state:', err);
      }
    }

    return () => {
      window.removeEventListener('geosan_project_log_new', handleLocalNewLog);
      window.removeEventListener('storage', handleStorage);
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [projectId]);

  return {
    logs,
    activeAgents,
    agentsPaused,
    appendLog,
    setAgentStatus
  };
}
