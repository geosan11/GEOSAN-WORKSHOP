import React, { useState } from 'react';
import { useToast } from './Toast';
import {
  Cpu,
  CheckCircle2,
  Terminal,
  Layers,
  Copy,
  Plus,
  Play,
  Activity,
  Server,
  Wrench,
  Search,
  ExternalLink,
  RefreshCw,
  Zap,
  Sparkles,
  Sliders,
  Shield,
  Code
} from 'lucide-react';

export interface MCPServerConfig {
  id: string;
  name: string;
  packageOrCommand: string;
  args: string[];
  status: 'active' | 'ready' | 'lazy' | 'offline' | 'builtin';
  transport: 'npx' | 'stdio' | 'sse' | 'builtin';
  toolsCount: number;
  description: string;
  category: 'design' | 'browser' | 'science' | 'custom' | 'system';
  tools: {
    name: string;
    description: string;
    mode: 'Eager' | 'Lazy';
    sampleArgs: string;
  }[];
}

const INITIAL_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'stitch',
    name: 'StitchMCP (Google Stitch AI)',
    packageOrCommand: 'npx -y @_davideast/stitch-mcp',
    args: ['-y', '@_davideast/stitch-mcp'],
    status: 'active',
    transport: 'npx',
    toolsCount: 15,
    description: 'AI-native design-to-code platform integration for screen generation, variant exploration, and design system synchronization.',
    category: 'design',
    tools: [
      { name: 'generate_screen_from_text', description: 'Generates visual React/Tailwind screens from natural language prompts', mode: 'Lazy', sampleArgs: '{\n  "prompt": "Dark mode analytics dashboard header with glowing stats"\n}' },
      { name: 'edit_screens', description: 'Surgically edits existing Stitch screen designs and layouts', mode: 'Lazy', sampleArgs: '{\n  "screen_id": "scr_01",\n  "instruction": "Change secondary accent to emerald green"\n}' },
      { name: 'create_design_system', description: 'Distills design tokens into reusable CSS & Tailwind themes', mode: 'Lazy', sampleArgs: '{\n  "name": "EHI Brand System",\n  "primary_color": "#F0B230"\n}' },
      { name: 'list_screens', description: 'Lists all generated screens in the Stitch workspace', mode: 'Lazy', sampleArgs: '{}' },
      { name: 'apply_design_system', description: 'Applies design tokens across project components', mode: 'Lazy', sampleArgs: '{\n  "design_system_id": "ds_ehi_v2"\n}' }
    ]
  },
  {
    id: 'efecto',
    name: 'Efecto MCP (@efectoapp/mcp)',
    packageOrCommand: 'npx -y @efectoapp/mcp',
    args: ['-y', '@efectoapp/mcp'],
    status: 'active',
    transport: 'npx',
    toolsCount: 8,
    description: 'Autonomous application state manipulation, visual effect rendering, and real-time state inspection.',
    category: 'custom',
    tools: [
      { name: 'inspect_state', description: 'Inspects active client state tree & localStorage keys', mode: 'Eager', sampleArgs: '{\n  "target": "auth_session"\n}' },
      { name: 'trigger_effect', description: 'Dispatches UI micro-animations and toast sequences', mode: 'Eager', sampleArgs: '{\n  "effect": "glow_pulse",\n  "element_id": "header_budget"\n}' },
      { name: 'sync_telemetry', description: 'Streams real-time state mutations to execution gateway', mode: 'Lazy', sampleArgs: '{\n  "channel": "telemetry_stream"\n}' }
    ]
  },
  {
    id: 'chrome-devtools-mcp',
    name: 'Chrome DevTools MCP',
    packageOrCommand: 'npx -y @modelcontextprotocol/server-chrome-devtools',
    args: ['-y', '@modelcontextprotocol/server-chrome-devtools'],
    status: 'active',
    transport: 'stdio',
    toolsCount: 22,
    description: 'Browser automation, screenshot capture, DOM inspection, network traffic auditing, and Lighthouse performance profiling.',
    category: 'browser',
    tools: [
      { name: 'take_screenshot', description: 'Captures crisp viewport or full-page WebP screenshot', mode: 'Lazy', sampleArgs: '{\n  "fullPage": true\n}' },
      { name: 'lighthouse_audit', description: 'Runs full accessibility, performance, and SEO audit', mode: 'Lazy', sampleArgs: '{\n  "url": "http://localhost:3000"\n}' },
      { name: 'evaluate_script', description: 'Executes isolated JavaScript inside target page DOM', mode: 'Lazy', sampleArgs: '{\n  "expression": "document.title"\n}' }
    ]
  },
  {
    id: 'antigravity-core',
    name: 'Antigravity Core Harness & Skills',
    packageOrCommand: 'antigravity-ide/builtin',
    args: [],
    status: 'builtin',
    transport: 'builtin',
    toolsCount: 38,
    description: 'Native Google Deepmind agent skills including code analysis, data autocleaning, security auditing, and pipeline orchestration.',
    category: 'system',
    tools: [
      { name: 'antigravity-guide', description: 'AGY CLI, slash commands, and customization reference', mode: 'Eager', sampleArgs: '{}' },
      { name: 'gcs-security-assessment', description: 'Assesses security posture of Cloud Storage buckets', mode: 'Eager', sampleArgs: '{\n  "bucket": "ehi-prod-logs"\n}' },
      { name: 'managing-python-dependencies', description: 'Ensures strict project venv isolation & uv package management', mode: 'Eager', sampleArgs: '{}' }
    ]
  }
];

export const MCPSettings: React.FC = () => {
  const toast = useToast();
  const [servers, setServers] = useState<MCPServerConfig[]>(INITIAL_MCP_SERVERS);
  const [selectedServerId, setSelectedServerId] = useState<string>('stitch');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'servers' | 'tools' | 'config' | 'test'>('servers');
  
  // Test simulator state
  const [simulatedTool, setSimulatedTool] = useState<string>('generate_screen_from_text');
  const [simulatedPayload, setSimulatedPayload] = useState<string>(
    '{\n  "prompt": "Create an executive FinOps card with glowing amber borders and live token metrics"\n}'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // New server modal form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCmd, setNewServerCmd] = useState('npx -y ');
  const [newServerDesc, setNewServerDesc] = useState('');

  const selectedServer = servers.find((s) => s.id === selectedServerId) || servers[0];

  const filteredTools = selectedServer.tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyConfig = (type: 'workspace' | 'global') => {
    const configObj = {
      mcpServers: servers.reduce((acc, s) => {
        if (s.transport === 'builtin') return acc;
        acc[s.id] = {
          command: s.packageOrCommand.split(' ')[0] || 'npx',
          args: s.args
        };
        return acc;
      }, {} as Record<string, { command: string; args: string[] }>)
    };

    const jsonString = JSON.stringify(configObj, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast.success(
      type === 'workspace'
        ? 'Copied .agents/mcp_config.json configuration!'
        : 'Copied ~/.gemini/settings.json configuration!'
    );
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      try {
        const parsed = JSON.parse(simulatedPayload);
        const result = {
          status: '200_OK',
          server: selectedServer.name,
          tool: simulatedTool,
          execution_time_ms: Math.floor(Math.random() * 80 + 35),
          timestamp: new Date().toISOString(),
          response: {
            success: true,
            message: `Executed tool '${simulatedTool}' successfully.`,
            output_artifacts: [
              `artifact_${simulatedTool}_${Date.now().toString(36)}.json`
            ],
            received_args: parsed
          }
        };
        setSimulationResult(JSON.stringify(result, null, 2));
        toast.success(`Tool ${simulatedTool} executed cleanly (${result.execution_time_ms}ms)`);
      } catch {
        setSimulationResult(
          JSON.stringify(
            {
              status: '400_BAD_REQUEST',
              error: 'Invalid JSON payload format provided in arguments editor.'
            },
            null,
            2
          )
        );
        toast.error('Invalid JSON payload');
      } finally {
        setIsSimulating(false);
      }
    }, 450);
  };

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName || !newServerCmd) {
      toast.error('Please enter a server name and command');
      return;
    }

    const id = newServerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cmdParts = newServerCmd.trim().split(' ');
    const command = cmdParts[0] || 'npx';
    const args = cmdParts.slice(1);

    const newConfig: MCPServerConfig = {
      id,
      name: newServerName,
      packageOrCommand: newServerCmd,
      args,
      status: 'active',
      transport: command === 'npx' ? 'npx' : 'stdio',
      toolsCount: 3,
      description: newServerDesc || 'Custom Model Context Protocol server',
      category: 'custom',
      tools: [
        {
          name: `${id}_ping`,
          description: 'Health check probe for custom MCP server',
          mode: 'Eager',
          sampleArgs: '{}'
        },
        {
          name: `${id}_query`,
          description: 'Executes context query against MCP backend',
          mode: 'Lazy',
          sampleArgs: '{\n  "query": "status"\n}'
        }
      ]
    };

    setServers((prev) => [...prev, newConfig]);
    setSelectedServerId(id);
    setShowAddModal(false);
    setNewServerName('');
    setNewServerCmd('npx -y ');
    setNewServerDesc('');
    toast.success(`MCP Server '${newServerName}' added to configuration`);
  };

  return (
    <div className="p-5 rounded-xl bg-[#161b22] border border-[#F0B230]/30 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0B230]/10 border border-[#F0B230]/40 flex items-center justify-center text-[#F0B230] shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-[#e6edf3] font-mono">
                Model Context Protocol (MCP) Control Plane
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ANTIGRAVITY ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#8b98a8]">
              Manage lazy-loaded & eager MCP servers, inspect capabilities, and run live tool simulations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopyConfig('workspace')}
            className="px-3 py-1.5 rounded-lg bg-[#0d1117] hover:bg-white/5 border border-white/10 text-xs font-mono font-semibold text-[#e6edf3] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Copy className="w-3.5 h-3.5 text-[#F0B230]" />
            Copy .agents Config
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#F0B230] hover:bg-[#FFBD59] text-[#0A1420] text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Add MCP Server
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 font-mono text-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('servers')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'servers'
              ? 'border-[#F0B230] text-[#F0B230] bg-[#F0B230]/5'
              : 'border-transparent text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Active Servers ({servers.length})
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tools'
              ? 'border-[#F0B230] text-[#F0B230] bg-[#F0B230]/5'
              : 'border-transparent text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Tool Explorer ({selectedServer.tools.length})
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'test'
              ? 'border-[#F0B230] text-[#F0B230] bg-[#F0B230]/5'
              : 'border-transparent text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Interactive Simulator
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-[#F0B230] text-[#F0B230] bg-[#F0B230]/5'
              : 'border-transparent text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Code className="w-3.5 h-3.5 text-cyan-400" />
          JSON Configuration
        </button>
      </div>

      {/* TAB 1: SERVERS OVERVIEW */}
      {activeTab === 'servers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((srv) => {
            const isSelected = srv.id === selectedServerId;
            return (
              <div
                key={srv.id}
                onClick={() => setSelectedServerId(srv.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative group ${
                  isSelected
                    ? 'bg-[#0d1117] border-[#F0B230] shadow-lg ring-1 ring-[#F0B230]/30'
                    : 'bg-[#0d1117]/60 border-white/5 hover:border-white/20 hover:bg-[#0d1117]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#F0B230] font-mono text-xs font-bold">
                      {srv.id.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#e6edf3] font-mono group-hover:text-[#F0B230] transition-colors">
                        {srv.name}
                      </h3>
                      <span className="text-[10px] font-mono text-[#8b98a8] block truncate">
                        ID: {srv.id}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      srv.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : srv.status === 'builtin'
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                        : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {srv.status}
                  </span>
                </div>

                <p className="text-xs text-[#8b98a8] font-sans leading-relaxed line-clamp-2">
                  {srv.description}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#8b98a8]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Wrench className="w-3 h-3 text-[#F0B230]" />
                      {srv.toolsCount} tools
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] uppercase">
                      {srv.transport}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedServerId(srv.id);
                      setActiveTab('tools');
                    }}
                    className="text-[10px] text-[#F0B230] font-bold hover:underline flex items-center gap-1"
                  >
                    Explore Tools &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TOOL EXPLORER */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          {/* Server Selector Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-[#0d1117] border border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs font-mono text-[#8b98a8] shrink-0">Server:</span>
              {servers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedServerId(s.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all shrink-0 ${
                    s.id === selectedServerId
                      ? 'bg-[#F0B230] text-[#0A1420]'
                      : 'bg-white/5 text-[#8b98a8] hover:text-[#e6edf3]'
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8b98a8]" />
              <input
                type="text"
                placeholder="Search tools in server…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161b22] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e6edf3] font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#F0B230]"
              />
            </div>
          </div>

          {/* Tools Grid */}
          <div className="space-y-3 font-mono text-xs">
            {filteredTools.map((tool) => (
              <div
                key={tool.name}
                className="p-4 rounded-lg bg-[#0d1117] border border-white/5 space-y-2 hover:border-white/15 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#e6edf3] text-sm">
                      {selectedServer.id}:{tool.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tool.mode === 'Eager'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {tool.mode}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSimulatedTool(tool.name);
                      setSimulatedPayload(tool.sampleArgs);
                      setActiveTab('test');
                    }}
                    className="px-2.5 py-1 rounded bg-[#F0B230]/10 hover:bg-[#F0B230]/20 text-[#F0B230] border border-[#F0B230]/30 text-[11px] font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Play className="w-3 h-3" /> Test in Simulator
                  </button>
                </div>

                <p className="text-xs text-[#8b98a8] font-sans leading-relaxed">
                  {tool.description}
                </p>

                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">
                    Sample JSON Arguments:
                  </span>
                  <pre className="p-2.5 rounded bg-[#161b22] border border-white/5 text-[11px] text-cyan-300 overflow-x-auto">
                    {tool.sampleArgs}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE SIMULATOR */}
      {activeTab === 'test' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#e6edf3] uppercase block">
                  Tool Dispatch Simulator
                </span>
                <span className="text-[11px] text-[#8b98a8]">
                  Simulate local MCP payload execution against server: <code className="text-[#F0B230]">{selectedServer.id}</code>
                </span>
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A1420] font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Simulating…
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Execute Dispatch Payload
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-[#8b98a8] uppercase block">
                  Select Tool Name
                </label>
                <select
                  value={simulatedTool}
                  onChange={(e) => {
                    setSimulatedTool(e.target.value);
                    const found = selectedServer.tools.find((t) => t.name === e.target.value);
                    if (found) setSimulatedPayload(found.sampleArgs);
                  }}
                  className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                >
                  {selectedServer.tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.mode})
                    </option>
                  ))}
                </select>

                <label className="text-[10px] text-[#8b98a8] uppercase block pt-2">
                  JSON Arguments Payload
                </label>
                <textarea
                  rows={8}
                  value={simulatedPayload}
                  onChange={(e) => setSimulatedPayload(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/10 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-[#8b98a8] uppercase block">
                  Execution Output Console
                </span>
                <div className="h-[248px] bg-[#161b22] border border-white/10 rounded-lg p-3 overflow-y-auto text-[11px] text-emerald-400">
                  {simulationResult ? (
                    <pre className="whitespace-pre-wrap">{simulationResult}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 font-mono">
                      <Terminal className="w-6 h-6 text-slate-700" />
                      <span>Ready for dispatch simulation…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JSON CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#e6edf3] block">
                  Workspace MCP Config (`.agents/mcp_config.json`)
                </span>
                <span className="text-[11px] text-[#8b98a8]">
                  Auto-loaded by Antigravity AI agent in GEOSAN-WORKSHOP workspace.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyConfig('workspace')}
                className="px-3 py-1 rounded bg-[#F0B230]/10 hover:bg-[#F0B230]/20 text-[#F0B230] border border-[#F0B230]/30 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy JSON
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-[#161b22] border border-white/5 text-cyan-300 overflow-x-auto text-xs leading-relaxed">
{JSON.stringify(
  {
    mcpServers: servers.reduce((acc, s) => {
      if (s.transport === 'builtin') return acc;
      acc[s.id] = {
        command: s.packageOrCommand.split(' ')[0] || 'npx',
        args: s.args
      };
      return acc;
    }, {} as Record<string, { command: string; args: string[] }>)
  },
  null,
  2
)}
            </pre>
          </div>
        </div>
      )}

      {/* ADD SERVER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#F0B230]/40 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#F0B230]" />
                Add Model Context Protocol Server
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddServer} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8b98a8] uppercase block mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Firebase Admin MCP"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8b98a8] uppercase block mb-1">
                  Package / CLI Command
                </label>
                <input
                  type="text"
                  placeholder="e.g. npx -y @firebase/mcp-server"
                  value={newServerCmd}
                  onChange={(e) => setNewServerCmd(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8b98a8] uppercase block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of capabilities provided by this MCP server…"
                  value={newServerDesc}
                  onChange={(e) => setNewServerDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-[#e6edf3] font-sans focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#F0B230] hover:bg-[#FFBD59] text-[#0A1420] font-bold shadow-md"
                >
                  Save MCP Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
