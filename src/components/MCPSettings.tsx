import React, { useState } from 'react';
import { useToast } from './Toast';
import { ChevronRight, Copy, Play, Plus } from 'lucide-react';

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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [testingTool, setTestingTool] = useState<string | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [simulatedTool, setSimulatedTool] = useState<string>('');
    const [simulatedPayload, setSimulatedPayload] = useState<string>('{}');
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newServerName, setNewServerName] = useState('');
    const [newServerCmd, setNewServerCmd] = useState('npx -y ');
    const [newServerDesc, setNewServerDesc] = useState('');

    const expanded = servers.find((s) => s.id === expandedId) || null;

    const configJson = JSON.stringify(
        {
            mcpServers: servers.reduce((acc, s) => {
                if (s.transport === 'builtin') return acc;
                acc[s.id] = {
                    command: s.packageOrCommand.split(' ')[0] || 'npx',
                    args: s.args,
                };
                return acc;
            }, {} as Record<string, { command: string; args: string[] }>),
        },
        null,
        2
    );

    const handleCopyConfig = () => {
        navigator.clipboard.writeText(configJson);
        toast.success('Copied workspace MCP config');
    };

    const handleRunSimulation = () => {
        if (!expanded) return;
        setIsSimulating(true);
        setSimulationResult(null);
        setTimeout(() => {
            try {
                const parsed = JSON.parse(simulatedPayload);
                const result = {
                    status: '200_OK',
                    server: expanded.name,
                    tool: simulatedTool,
                    execution_time_ms: Math.floor(Math.random() * 80 + 35),
                    timestamp: new Date().toISOString(),
                    response: {
                        success: true,
                        message: `Executed tool '${simulatedTool}' successfully.`,
                        received_args: parsed,
                    },
                };
                setSimulationResult(JSON.stringify(result, null, 2));
                toast.success(`Tool ${simulatedTool} finished`);
            } catch {
                setSimulationResult(JSON.stringify({ status: '400_BAD_REQUEST', error: 'Invalid JSON payload' }, null, 2));
                toast.error('Invalid JSON payload');
            } finally {
                setIsSimulating(false);
            }
        }, 450);
    };

    const handleAddServer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newServerName || !newServerCmd) {
            toast.error('Enter a server name and command');
            return;
        }
        const id = newServerName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'server';
        const cmdParts = newServerCmd.trim().split(' ');
        const command = cmdParts[0] || 'npx';
        const args = cmdParts.slice(1);
        const created: MCPServerConfig = {
            id,
            name: newServerName,
            packageOrCommand: newServerCmd,
            args,
            status: 'active',
            transport: command === 'npx' ? 'npx' : 'stdio',
            toolsCount: 2,
            description: newServerDesc || 'Custom MCP server',
            category: 'custom',
            tools: [
                { name: `${id}_ping`, description: 'Health check', mode: 'Eager', sampleArgs: '{}' },
                { name: `${id}_query`, description: 'Context query', mode: 'Lazy', sampleArgs: '{\n  "query": "status"\n}' },
            ],
        };
        setServers((prev) => [...prev, created]);
        setExpandedId(id);
        setShowAddModal(false);
        setNewServerName('');
        setNewServerCmd('npx -y ');
        setNewServerDesc('');
        toast.success(`${newServerName} added`);
    };

    const visibleTools = expanded
        ? expanded.tools.filter(
            (tool) =>
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary">
                    <Plus className="w-3.5 h-3.5" />
                    Add server
                </button>
            </div>

            <div className="section-card overflow-hidden divide-y divide-[color:var(--border-app)]">
                {servers.map((server) => {
                    const open = expandedId === server.id;
                    return (
                        <div key={server.id}>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                                aria-expanded={open}
                                onClick={() => {
                                    setExpandedId(open ? null : server.id);
                                    setTestingTool(null);
                                    setSimulationResult(null);
                                    setSearchQuery('');
                                }}
                            >
                                <span className="min-w-0">
                                    <span className="text-main font-bold text-sm block truncate">{server.name}</span>
                                    <span className="text-meta block mt-1 normal-case tracking-normal">
                                        {server.tools.length} tools · {server.transport}
                                    </span>
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                    <span className={`stamp ${server.status === 'active' || server.status === 'builtin' ? 'stamp-success' : 'stamp-warn'}`}>
                                        {server.status}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
                                </span>
                            </button>

                            {open && expanded ? (
                                <div className="border-t border-app px-4 py-4 space-y-4 bg-app">
                                    <p className="text-lede text-[0.75rem]">{expanded.description}</p>

                                    <label className="block space-y-1">
                                        <span className="text-meta">Find a tool</span>
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search tools"
                                            className="field w-full"
                                        />
                                    </label>

                                    <ul className="space-y-2">
                                        {visibleTools.map((tool) => {
                                            const testing = testingTool === tool.name;
                                            return (
                                                <li key={tool.name} className="border border-app rounded-[var(--radius-card)] bg-card p-3 space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-mono text-xs font-bold text-main">{tool.name}</span>
                                                                <span className="stamp">{tool.mode}</span>
                                                            </div>
                                                            <p className="text-lede text-[0.75rem] mt-1">{tool.description}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost shrink-0"
                                                            onClick={() => {
                                                                if (testing) {
                                                                    setTestingTool(null);
                                                                    return;
                                                                }
                                                                setTestingTool(tool.name);
                                                                setSimulatedTool(tool.name);
                                                                setSimulatedPayload(tool.sampleArgs);
                                                                setSimulationResult(null);
                                                            }}
                                                        >
                                                            <Play className="w-3 h-3" />
                                                            {testing ? 'Close test' : 'Test'}
                                                        </button>
                                                    </div>
                                                    {testing ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                rows={5}
                                                                value={simulatedPayload}
                                                                onChange={(e) => setSimulatedPayload(e.target.value)}
                                                                className="field w-full font-mono text-xs"
                                                                aria-label="JSON arguments"
                                                            />
                                                            <button type="button" onClick={handleRunSimulation} disabled={isSimulating} className="btn btn-ink">
                                                                {isSimulating ? 'Running…' : 'Run'}
                                                            </button>
                                                            {simulationResult ? (
                                                                <pre className="text-[11px] font-mono text-main overflow-x-auto whitespace-pre-wrap">{simulationResult}</pre>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <div className="text-xs font-mono text-muted">
                                        {expanded.packageOrCommand}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <section className="section-card overflow-hidden">
                <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={configOpen}
                    onClick={() => setConfigOpen((v) => !v)}
                >
                    <span>
                        <span className="text-section-title block">Workspace config</span>
                        <span className="text-lede text-[0.75rem]">JSON for the servers above</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 text-muted transition-transform ${configOpen ? 'rotate-90' : ''}`} />
                </button>
                {configOpen ? (
                    <div className="border-t border-app p-4 space-y-3">
                        <button type="button" onClick={handleCopyConfig} className="btn btn-ghost">
                            <Copy className="w-3.5 h-3.5" />
                            Copy JSON
                        </button>
                        <pre className="text-[11px] font-mono text-main overflow-x-auto whitespace-pre-wrap">{configJson}</pre>
                    </div>
                ) : null}
            </section>

            {showAddModal ? (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card border border-app rounded-[var(--radius-card)] p-5 max-w-lg w-full space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-section-title">Add server</h3>
                            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost" aria-label="Close">
                                Close
                            </button>
                        </div>
                        <form onSubmit={handleAddServer} className="space-y-3">
                            <label className="block space-y-1">
                                <span className="text-meta">Name</span>
                                <input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} className="field w-full" placeholder="Firebase Admin" />
                            </label>
                            <label className="block space-y-1">
                                <span className="text-meta">Command</span>
                                <input value={newServerCmd} onChange={(e) => setNewServerCmd(e.target.value)} className="field w-full font-mono" />
                            </label>
                            <label className="block space-y-1">
                                <span className="text-meta">What it does</span>
                                <textarea rows={2} value={newServerDesc} onChange={(e) => setNewServerDesc(e.target.value)} className="field w-full" />
                            </label>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
