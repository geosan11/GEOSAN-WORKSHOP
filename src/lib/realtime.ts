import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AgentTask, QARun, CostEvent } from './types';

export interface SubscriptionHandle {
  unsubscribe: () => void;
}

/**
 * Subscribes to changes on agent_tasks for an organization.
 * If Supabase client is null (Demo Mode), returns a safe mock handle.
 */
export function subscribeToTasks(
  supabase: SupabaseClient | null,
  orgId: string,
  onTask: (task: AgentTask) => void
): SubscriptionHandle {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const channel: RealtimeChannel = supabase
    .channel(`tasks:${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_tasks',
        filter: `org_id=eq.${orgId}`
      },
      (payload) => {
        if (payload.new) {
          onTask(payload.new as AgentTask);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribes to changes on qa_runs for an organization.
 */
export function subscribeToQARuns(
  supabase: SupabaseClient | null,
  orgId: string,
  onRun: (run: QARun) => void
): SubscriptionHandle {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const channel: RealtimeChannel = supabase
    .channel(`qa:${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'qa_runs',
        filter: `org_id=eq.${orgId}`
      },
      (payload) => {
        if (payload.new) {
          onRun(payload.new as QARun);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribes to new cost_events for an organization.
 */
export function subscribeToCosts(
  supabase: SupabaseClient | null,
  orgId: string,
  onCost: (cost: CostEvent) => void
): SubscriptionHandle {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const channel: RealtimeChannel = supabase
    .channel(`costs:${orgId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cost_events',
        filter: `org_id=eq.${orgId}`
      },
      (payload) => {
        if (payload.new) {
          onCost(payload.new as CostEvent);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}
