/**
 * Cyber-Industrial Silicon Foundry Types
 * High-performance hardware-accelerated telemetry and micro-architectural models.
 */

export type SiliconStatus = 'IDLE' | 'PROCESSING' | 'FABRICATING' | 'SCANNING' | 'CRASHED' | 'FAULT';

export interface SubCoreStatus {
  coreId: string;
  name: string;
  loadPct: number;
  temperatureC: number;
  state: 'ONLINE' | 'ACTIVE' | 'TRIPPED' | 'IDLE';
}

export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  limit: number;
}

export interface MemoryAdrRecord {
  id: string;
  title: string;
  decision: string;
  status: 'APPROVED' | 'IN_REVIEW' | 'BASELINED';
}

export interface InnerWorldData {
  activeFile: string;
  astTokenDepth: number;
  subCoreStatuses: SubCoreStatus[];
  liveLogStream: string[];
  memoryAdrs: MemoryAdrRecord[];
}

export interface AgentNode {
  id: 'die-01' | 'die-02' | 'die-03';
  dieNumber: string;
  name: string;
  role: string;
  voltage: string;
  status: SiliconStatus;
  queueCount: number;
  isCrashed: boolean;
  subCores: SubCoreStatus[];
  tokenMetrics: TokenMetrics;
  avatarType: 'NEXUS_GYRO' | 'CYBER_FORGE' | 'SENTINEL_EYE';
  innerWorld: InnerWorldData;
}

export interface TaskPacket {
  id: string;
  sourceId: string;
  targetId: string;
  priority: 'CRITICAL' | 'NORMAL' | 'HIGH';
  payloadPreview: string;
}

export interface TelemetryState {
  clockCycle: number;
  busFrequency: string; // e.g. "4.82 GHz"
  systemStatus: 'NOMINAL' | 'CIRCUIT_TRIP' | 'SYNTAX_FAULT' | 'RECONCILING';
  faultMessage?: string;
  busVoltage: string; // e.g. "1.18 V"
}
