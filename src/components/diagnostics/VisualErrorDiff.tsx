import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  Terminal,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export interface DiagnosticError {
  id: string;
  tier: string;
  endpoint: string;
  breakingKey: string;
  issue: string;
  expectedType: string;
  receivedType: string;
  expectedSchemaText: string;
  receivedPayloadText: string;
  suggestedFix: string;
}

export const SAMPLE_DIAGNOSTICS: DiagnosticError[] = [
  {
    id: 'diag-edgepoint-null-id',
    tier: 'Tier 2: Data',
    endpoint: '/api/v1/telemetry/ingest',
    breakingKey: 'fixture_id',
    issue: 'Expected string, received null on key: fixture_id',
    expectedType: 'string (UUIDv4 or slug)',
    receivedType: 'null',
    expectedSchemaText: `// CONTRACT.md: SensorTelemetryPayload
export interface SensorTelemetryPayload {
  fixture_id: string;        // Non-null UUIDv4 or slug
  timestamp: string;         // ISO8601 UTC timestamp
  node_mac: string;          // EUI-48 MAC address
  readings: {
    ambient_temp_c: number;  // Range: -40.0 to 85.0
    pressure_kpa: number;    // Range: 80.0 to 120.0
    voltage_mv: number;      // Range: 2800 to 4200
  };
  firmware_version: string;
}`,
    receivedPayloadText: `// Received HTTP POST Body:
{
  "fixture_id": null, /* ⚠️ BREAKING: Invariant Violation */
  "timestamp": "2026-10-01T14:22:04.112Z",
  "node_mac": "00:1B:44:11:3A:B7",
  "readings": {
    "ambient_temp_c": 28.4,
    "pressure_kpa": 101.3,
    "voltage_mv": 3310
  },
  "firmware_version": "1.4.2"
}`,
    suggestedFix: 'Enforce fallback UUID generation on sensor edge aggregator before JSON serialization.'
  },
  {
    id: 'diag-weighbridge-gross-tare',
    tier: 'Tier 1: SaaS',
    endpoint: '/api/v1/weighbridge/tickets',
    breakingKey: 'gross_weight_kg',
    issue: 'Gross weight (8,400kg) cannot be less than tare weight (14,200kg)',
    expectedType: 'number > tare_weight_kg',
    receivedType: '8400 < 14200 (Invalid Delta)',
    expectedSchemaText: `// CONTRACT.md: WeighbridgeTicketPayload
export interface WeighbridgeTicketPayload {
  ticket_number: string;
  truck_plate: string;
  gross_weight_kg: number; // MUST be > tare_weight_kg
  tare_weight_kg: number;  // Tare calibration
  net_weight_kg: number;   // gross - tare > 0
  product_code: 'PMS' | 'AGO' | 'DPK';
}`,
    receivedPayloadText: `// Received HTTP POST Body:
{
  "ticket_number": "WB-2026-94821",
  "truck_plate": "LAG-492-XA",
  "gross_weight_kg": 8400,  /* ⚠️ BREAKING: gross < tare */
  "tare_weight_kg": 14200,
  "net_weight_kg": -5800,   /* Invariant Failure */
  "product_code": "PMS"
}`,
    suggestedFix: 'Check weighbridge sensor zero calibration; reverse axle sequence detected on scale bed.'
  },
  {
    id: 'diag-aviation-captain-license',
    tier: 'Tier 3: Utility',
    endpoint: '/api/v1/flight-log/dispatch',
    breakingKey: 'captain_license',
    issue: 'Expected string, received undefined on key: captain_license',
    expectedType: 'string (ATPL ID)',
    receivedType: 'undefined (Missing Key)',
    expectedSchemaText: `// CONTRACT.md: ElectronicFlightLog
export interface ElectronicFlightLog {
  flight_number: string;    // e.g., "GEO-402"
  aircraft_tail: string;    // e.g., "5N-GEO"
  captain_license: string;  // Non-null mandatory ATPL
  departure_utc: string;
  arrival_utc: string;
}`,
    receivedPayloadText: `// Received HTTP POST Body:
{
  "flight_number": "GEO-402",
  "aircraft_tail": "5N-GEO",
  /* ⚠️ BREAKING: "captain_license" key missing */
  "departure_utc": "2026-10-01T12:00:00Z",
  "arrival_utc": "2026-10-01T13:45:00Z"
}`,
    suggestedFix: 'Block pre-flight dispatch until Captain Crew ID is validated against NCAA roster API.'
  }
];

interface VisualErrorDiffProps {
  activeDiagnostic?: DiagnosticError;
  onResolve?: () => void;
  onSelectDiagnostic?: (diag: DiagnosticError) => void;
}

export const VisualErrorDiff: React.FC<VisualErrorDiffProps> = ({
  activeDiagnostic = SAMPLE_DIAGNOSTICS[0],
  onResolve,
  onSelectDiagnostic
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `SCHEMA MISMATCH REPORT:\nEndpoint: ${activeDiagnostic.endpoint}\nIssue: ${activeDiagnostic.issue}\nFix: ${activeDiagnostic.suggestedFix}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">
                Contract Invariant Violation
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                {activeDiagnostic.tier}
              </span>
            </div>
            <h4 className="text-xs font-mono font-bold text-slate-200 truncate">
              {activeDiagnostic.endpoint}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy error report"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onResolve && (
            <button
              type="button"
              onClick={onResolve}
              className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-[11px] font-mono font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolve</span>
            </button>
          )}
        </div>
      </div>

      {/* Pointer Line Alert */}
      <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center gap-2.5 text-xs font-mono">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
        <span className="text-red-300 font-semibold tracking-tight">
          → {activeDiagnostic.issue}
        </span>
      </div>

      {/* Side-by-Side Visual Diff */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
        {/* Left: Expected Schema (Emerald) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Expected Contract (CONTRACT.md)
            </span>
            <span className="text-slate-500">TypeScript</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-300 overflow-x-auto max-h-48 leading-relaxed whitespace-pre font-mono">
            {activeDiagnostic.expectedSchemaText}
          </div>
        </div>

        {/* Right: Received Payload (Red) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-red-400 font-bold uppercase tracking-wider px-1">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Received Payload (Wire JSON)
            </span>
            <span className="text-slate-500">HTTP 422 Unprocessable</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-red-500/40 text-red-200 overflow-x-auto max-h-48 leading-relaxed whitespace-pre font-mono">
            {activeDiagnostic.receivedPayloadText}
          </div>
        </div>
      </div>

      {/* Remediation Hint */}
      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-2 text-[11px] font-mono text-slate-300">
        <Sparkles className="w-3.5 h-3.5 text-[#F0B230] shrink-0 mt-0.5" />
        <div>
          <span className="text-[#F0B230] font-bold">Suggested Remediation: </span>
          <span>{activeDiagnostic.suggestedFix}</span>
        </div>
      </div>

      {/* Diagnostic Switcher Pills */}
      {onSelectDiagnostic && (
        <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
          <span className="text-slate-500 uppercase tracking-wider">Scenarios:</span>
          {SAMPLE_DIAGNOSTICS.map((diag) => (
            <button
              key={diag.id}
              type="button"
              onClick={() => onSelectDiagnostic(diag)}
              className={`px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                diag.id === activeDiagnostic.id
                  ? 'bg-red-950 text-red-300 border-red-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {diag.breakingKey}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
