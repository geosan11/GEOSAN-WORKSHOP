/**
 * Shared Upstream Status Client
 * Connects to SSE /status/stream for event-driven updates.
 * NO setInterval polling.
 */

import { useState, useEffect } from 'react';
import { WeeklyLedgerState, DEFAULT_WEEKLY_LEDGER } from './budget';

export interface UpstreamStatusData {
  status: 'nominal' | 'healthy' | 'degraded';
  upstream_pulls_this_process: number;
  last_upstream_pull_at: string;
  next_pull_allowed_at: string;
  cache_ttl_seconds: number;
  verticals: {
    ehi: string;
    iyanuoluwa: string;
    aviation: string;
    edgepoint: string;
  };
  budget: WeeklyLedgerState;
}

const DEFAULT_STATUS_DATA: UpstreamStatusData = {
  status: 'nominal',
  upstream_pulls_this_process: 1,
  last_upstream_pull_at: new Date().toISOString(),
  next_pull_allowed_at: new Date(Date.now() + 3600000).toISOString(),
  cache_ttl_seconds: 3600,
  verticals: {
    ehi: 'online',
    iyanuoluwa: 'online',
    aviation: 'online',
    edgepoint: 'online',
  },
  budget: DEFAULT_WEEKLY_LEDGER,
};

let currentStatus: UpstreamStatusData = DEFAULT_STATUS_DATA;
const listeners = new Set<(status: UpstreamStatusData) => void>();
let eventSource: EventSource | null = null;
let isConnected = false;

function initStreamListener(): void {
  if (typeof window === 'undefined' || eventSource) return;

  try {
    eventSource = new EventSource('/status/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        currentStatus = { ...DEFAULT_STATUS_DATA, ...parsed };
        isConnected = true;
        listeners.forEach((listener) => listener(currentStatus));
      } catch {
        // Ignore invalid frame
      }
    };

    eventSource.onerror = () => {
      isConnected = false;
      // Do not setInterval poll. The browser's EventSource automatically reconnects.
    };
  } catch {
    // Fallback if environment blocks EventSource
  }
}

export function useSharedStatus(): {
  statusData: UpstreamStatusData;
  isConnected: boolean;
} {
  const [data, setData] = useState<UpstreamStatusData>(currentStatus);
  const [connected, setConnected] = useState<boolean>(isConnected);

  useEffect(() => {
    initStreamListener();

    const listener = (newStatus: UpstreamStatusData) => {
      setData(newStatus);
      setConnected(true);
    };

    listeners.add(listener);
    // Initial sync
    setData(currentStatus);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { statusData: data, isConnected: connected };
}

export function getSharedStatusSnapshot(): UpstreamStatusData {
  return currentStatus;
}
