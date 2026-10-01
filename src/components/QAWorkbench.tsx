import React, { useState } from 'react';
import {
  QARun,
  QAFinding,
  ProjectRegistry,
  QARunType,
  TargetPlatform
} from '../types';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Zap,
  Globe,
  Smartphone,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Terminal,
  Activity,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface QAWorkbenchProps {
  runs: QARun[];
  findings: QAFinding[];
  projects: ProjectRegistry[];
  onTriggerQARun: (
    projectId: string,
    runType: QARunType,
    platform: TargetPlatform
  ) => void;
  onDispatchFixForFinding: (finding: QAFinding) => void;
  onResolveFinding: (findingId: string) => void;
}

export const QAWorkbench: React.FC<QAWorkbenchProps> = ({
  runs,
  findings,
  projects,
  onTriggerQARun,
  onDispatchFixForFinding,
  onResolveFinding
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'findings' | 'runs' | 'replays' | 'axtree'>('findings');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(findings[0]?.id || null);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<string>('30x');

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const currentProject = projectMap.get(selectedProjectId) || projects[0];

  const projectFindings = findings.filter(
    (f) => !selectedProjectId || f.project_id === selectedProjectId
  );
  const projectRuns = runs.filter(
    (r) => !selectedProjectId || r.project_id === selectedProjectId
  );

  const selectedFinding =
    findings.find((f) => f.id === selectedFindingId) || projectFindings[0] || null;

  const handleSimulateFastReplay = () => {
    setIsReplaying(true);
    setTimeout(() => {
      setIsReplaying(false);
      onTriggerQARun(selectedProjectId, 'replay', 'web');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Workbench Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>QA Vertical</span>
            <span aria-hidden="true">·</span>
            <span>Reasoning 3: Autonomous Testing Agent</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">Comber MCP + Proba MCP</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Autonomous QA Workbench
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            DOM-first accessibility tree traversal (~250 tokens/step), 30x zero-inference replay scripts, and role-isolation security testing.
          </p>
        </div>

        {/* Target Project Selector & Fast Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => onTriggerQARun(selectedProjectId, 'explore', 'web')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-cyan-400" />
            Explore DOM
          </button>

          <button
            onClick={handleSimulateFastReplay}
            disabled={isReplaying}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {isReplaying ? 'Replaying 30x...' : 'Run 30x Replay (0 Tokens)'}
          </button>
        </div>
      </div>

      {/* Engine MCP Architecture Badges */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="text-slate-500">Connected MCP Engines:</span>
          <span className="text-cyan-400">comber-mcp (web)</span>
          <span className="text-slate-600">|</span>
          <span className="text-purple-400">proba-mcp (api/db)</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400">appcrawl (ios/android)</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">maestro (mobile replays)</span>
        </div>

        <div className="text-slate-400">
          Target URL: <span className="text-white">{currentProject?.vercel_deployment_url || 'https://target.app'}</span>
        </div>
      </div>

      {/* Sub navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('findings')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'findings'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Findings & Regressions ({projectFindings.length})
        </button>

        <button
          onClick={() => setActiveSubTab('runs')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'runs'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Execution Runs ({projectRuns.length})
        </button>

        <button
          onClick={() => setActiveSubTab('replays')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'replays'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          Stored Replay Scripts
        </button>

        <button
          onClick={() => setActiveSubTab('axtree')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'axtree'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          DOM Accessibility Tree Inspector
        </button>
      </div>

      {/* Tab 1: Normalized Findings & Bug Triage */}
      {activeSubTab === 'findings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Findings List (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            {projectFindings.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Zero open QA findings on this project! All tests passing.
              </div>
            ) : (
              projectFindings.map((finding) => {
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <div
                    key={finding.id}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/50'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span
                        className={`font-mono uppercase font-semibold ${
                          finding.severity === 'critical'
                            ? 'text-rose-400'
                            : finding.severity === 'high'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <span className="capitalize font-mono text-slate-400">
                        {finding.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white leading-snug">
                      {finding.title}
                    </h4>

                    <div className="mt-2 text-xs font-mono text-slate-400 truncate">
                      {finding.component}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Finding Detail & 1-Click Fix Dispatch (7 cols) */}
          <div className="lg:col-span-7">
            {selectedFinding ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                    <span className="uppercase text-rose-400 font-semibold">
                      {selectedFinding.severity} severity
                    </span>
                    <span>Component: {selectedFinding.component}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {selectedFinding.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  <span className="text-xs uppercase font-mono text-slate-400 block">
                    Defect Description & Root Cause
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {selectedFinding.description}
                  </p>
                </div>

                {selectedFinding.dom_selector && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
                    <span className="text-slate-500">DOM Selector: </span>
                    {selectedFinding.dom_selector}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs uppercase font-mono text-slate-400 block">
                    Reproduction Sequence (Autonomous Trace)
                  </span>
                  <ol className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                    {selectedFinding.reproduction_steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Dispatch Fix Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onResolveFinding(selectedFinding.id)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Mark as Resolved
                  </button>

                  <button
                    onClick={() => onDispatchFixForFinding(selectedFinding)}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Dispatch Fix to Coding Agent
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                Select a finding to inspect reproduction steps and dispatch fixes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: QA Execution Runs */}
      {activeSubTab === 'runs' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">Run ID & Type</th>
                <th className="py-3 px-4">Platform & Role</th>
                <th className="py-3 px-4">Execution Speed</th>
                <th className="py-3 px-4">DOM Nodes</th>
                <th className="py-3 px-4">Tokens Used</th>
                <th className="py-3 px-4">Findings</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {projectRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{run.id}</span>
                    <span className="block text-slate-500 uppercase">{run.run_type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      {run.target_platform === 'mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>{run.target_platform}</span>
                    </div>
                    <span className="text-slate-500">{run.role_tested}</span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400">{run.execution_speed}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-300">{run.dom_nodes_inspected}</td>
                  <td className="py-3 px-4 tabular-nums">
                    {run.tokens_consumed === 0 ? (
                      <span className="text-emerald-400">0 tok (Zero AI)</span>
                    ) : (
                      <span className="text-slate-300">{run.tokens_consumed.toLocaleString()} tok</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        run.findings_count > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {run.findings_count}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`capitalize ${
                        run.status === 'completed'
                          ? 'text-emerald-400'
                          : run.status === 'running'
                          ? 'text-cyan-400 animate-pulse'
                          : 'text-rose-400'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Stored Replay Scripts */}
      {activeSubTab === 'replays' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Stored Headless Replay Scripts</h3>
              <p className="text-xs text-slate-400">
                Stored in repo at <code className="text-cyan-400">qa/replays/</code> · Run on every PR, deploy, and hourly cron with zero token cost
              </p>
            </div>
            <button
              onClick={handleSimulateFastReplay}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Replay at 30x Speed
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-96">
{`# File: qa/replays/kano_intake.yaml
# Autonomously synthesized by AetherOrch DOM Exploration Agent
version: "2.4"
target_url: "${currentProject?.vercel_deployment_url}/cargo/intake"
role: "hub_attendant_kano"
execution_speed: "30x_headless"

steps:
  - action: "navigate"
    url: "/cargo/intake"
    assert_status: 200
  - action: "type"
    target: "#input-waybill-id"
    value: "KB-8921-99"
  - action: "type"
    target: "#input-weight-kg"
    value: "42.5"
  - action: "click"
    target: "#select-destination"
    select_option: "KANO_HUB"
  - action: "click"
    target: "#payment-method-select"
    select_option: "CASH"
  - action: "click"
    target: "#btn-submit-intake"
    wait_for_selector: ".receipt-preview-banner"
    assert_text: "Waybill Staged for Dispatch"`}
          </pre>
        </div>
      )}

      {/* Tab 4: DOM Accessibility Tree Inspector */}
      {activeSubTab === 'axtree' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                DOM-First Accessibility Tree (AXTree) Traversal
              </h3>
              <p className="text-xs text-slate-400">
                Reasoning 3 architecture: Parse raw AXTree nodes (~200–400 tokens/step) rather than multi-modal vision screenshots (~1,000–1,800 tokens/step).
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              <span className="text-emerald-400 block font-semibold">78% Token Reduction</span>
              <span className="text-slate-500">280 tok vs 1,400 tok vision</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-cyan-400 font-semibold block">Indexed Interactive Nodes</span>
              <div className="space-y-1.5 text-slate-400">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-purple-400">role:</span> button | <span className="text-purple-400">name:</span> "Submit Intake" | <span className="text-emerald-400">accessible:</span> true
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-purple-400">role:</span> combobox | <span className="text-purple-400">id:</span> #payment-method-select | <span className="text-amber-400">receipt_mode flag</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-purple-400">role:</span> textbox | <span className="text-purple-400">placeholder:</span> "Declared NGN Value" | <span className="text-emerald-400">validated:</span> true
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-purple-400">role:</span> dialog | <span className="text-purple-400">aria-modal:</span> true | <span className="text-slate-400">state: hidden</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-amber-400 font-semibold block">Vision Fallback Boundary</span>
              <p className="text-slate-400 font-sans leading-relaxed">
                DOM parsing handles 94% of form, button, and navigation assertions. Vision models (Gemini Flash Multimodal) are only engaged when reaching canvas barcode renderers or drag-and-drop file upload zones.
              </p>
              <div className="mt-3 p-2 rounded bg-slate-900 text-slate-400">
                Current Canvas Status: <span className="text-emerald-400">No layout drift on barcode canvas</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
