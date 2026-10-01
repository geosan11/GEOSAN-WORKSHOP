import React, { useState } from 'react';
import { ProjectRegistry, TaskType } from '../types';
import { Play, Sparkles, X, Layers, Cpu, AlertCircle } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectRegistry[];
  initialProjectId?: string;
  onDispatchTask: (params: {
    projectId: string;
    taskType: TaskType;
    prompt: string;
    model: string;
    spawnSubagents: boolean;
  }) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  initialProjectId,
  onDispatchTask
}) => {
  const [projectId, setProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );
  const [taskType, setTaskType] = useState<TaskType>('BUILD_FEATURE');
  const [model, setModel] = useState<string>('gemini-3.5-flash');
  const [spawnSubagents, setSpawnSubagents] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');

  if (!isOpen) return null;

  const quickTemplates = [
    {
      label: 'Kano Hub Sync Mode Bug',
      type: 'FIX_BUG' as TaskType,
      model: 'gemini-3.5-flash',
      prompt:
        'Fix receipt_mode vs payment_mode inconsistency causing failed cargo reconciliation at Kano Hub terminal when offline sync replays.'
    },
    {
      label: 'Debt Clearance Netting Engine',
      type: 'BUILD_FEATURE' as TaskType,
      model: 'gemini-3.5-flash',
      prompt:
        'Implement bilateral debt clearance engine for multi-party invoice netting with atomic EOD settlement locking.'
    },
    {
      label: 'Autonomous DOM Exploration',
      type: 'QA_EXPLORE' as TaskType,
      model: 'gemini-3.5-flash',
      prompt:
        'Autonomously explore the entire freight intake workflow as Hub Attendant role. Parse DOM tree, check every button, verify waybill generation and receipt PDF export.'
    },
    {
      label: 'Role Isolation Security Audit',
      type: 'QA_SECURITY' as TaskType,
      model: 'gemini-3.5-flash',
      prompt:
        'Verify strict role isolation between Apron Ramp Agent, Fuel Bowser Dispatcher, and Airside Supervisor.'
    }
  ];

  const handleApplyTemplate = (tpl: typeof quickTemplates[0]) => {
    setTaskType(tpl.type);
    setModel(tpl.model);
    setPrompt(tpl.prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onDispatchTask({
      projectId,
      taskType,
      prompt: prompt.trim(),
      model,
      spawnSubagents
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dispatch Autonomous Agent Task</h2>
              <p className="text-xs text-slate-400">
                AetherOrch Orchestration Layer · Task Queue & Subagent Spawner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Templates */}
          <div className="space-y-2">
            <span className="text-xs uppercase font-mono text-slate-400 block">
              Quick Architecture Templates
            </span>
            <div className="flex flex-wrap gap-2">
              {quickTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-750 transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project & Task Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Target Project Vertical</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.vertical})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="BUILD_FEATURE">BUILD_FEATURE</option>
                <option value="FIX_BUG">FIX_BUG</option>
                <option value="QA_EXPLORE">QA_EXPLORE (DOM Tree)</option>
                <option value="QA_REPLAY">QA_REPLAY (30x Headless)</option>
                <option value="QA_TARGETED">QA_TARGETED</option>
                <option value="QA_SECURITY">QA_SECURITY (Role Matrix)</option>
                <option value="DEPLOY">DEPLOY (Cloud Run MCP)</option>
                <option value="REPORT">REPORT (Cost & Performance)</option>
              </select>
            </div>
          </div>

          {/* Model Selection & Subagents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Primary Model Router</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="gemini-3.5-flash">Google Gemini 3.5 Flash ($0.15/$0.60 per 1M)</option>
                <option value="claude-sonnet-4">Anthropic Claude Sonnet 4 ($3.00/$15.00)</option>
                <option value="grok-4">xAI Grok 4 ($2.00/$10.00)</option>
                <option value="o3-mini">OpenAI o3-mini ($1.10/$4.40)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-300 block font-semibold">Spawn Subagents</span>
                <span className="text-slate-500 text-[11px]">Parallel frontend, backend & QA</span>
              </div>
              <input
                type="checkbox"
                checked={spawnSubagents}
                onChange={(e) => setSpawnSubagents(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Natural Language Instruction Prompt</span>
              <span className="text-slate-500">Autonomous Execution</span>
            </label>
            <textarea
              rows={4}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Unify receipt_mode and payment_mode state flags in CargoSyncClient and enforce transactional idempotency key..."
              className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Dispatch to Agent Harness
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
