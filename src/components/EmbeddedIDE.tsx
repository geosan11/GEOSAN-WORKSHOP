import React, { useState } from 'react';
import { FileNode } from '../types';
import {
  Folder,
  FolderOpen,
  FileCode,
  Terminal,
  Play,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  SplitSquareVertical,
  Check,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface EmbeddedIDEProps {
  files: FileNode[];
  onSaveFile: (path: string, content: string) => void;
  agentPatchingActive?: boolean;
}

export const EmbeddedIDE: React.FC<EmbeddedIDEProps> = ({
  files,
  onSaveFile,
  agentPatchingActive = false
}) => {
  const [openFiles, setOpenFiles] = useState<string[]>([
    'src/modules/cargo/syncClient.ts'
  ]);
  const [activeFilePath, setActiveFilePath] = useState<string>(
    'src/modules/cargo/syncClient.ts'
  );
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.content !== undefined) {
          map[node.path] = node.content;
        }
        if (node.children) traverse(node.children);
      }
    };
    traverse(files);
    return map;
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/modules': true,
    'src/modules/cargo': true,
    qa: true,
    'qa/replays': true
  });

  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'AetherOrch code-server container [codercom/code-server:latest] initialized on port 8080',
    'Workspace volume mounted: /workspace/ehi-cargo-hub',
    'Agent Antigravity Harness connected via socket: /run/user/1000/a2a.sock',
    'Type "help" or run "npm run qa:replay" to verify current patch.'
  ]);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleSelectFile = (path: string, content: string = '') => {
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = openFiles.filter((p) => p !== path);
    setOpenFiles(updated);
    if (activeFilePath === path) {
      setActiveFilePath(updated[0] || '');
    }
  };

  const handleEditorChange = (newContent: string) => {
    setFileContents((prev) => ({ ...prev, [activeFilePath]: newContent }));
  };

  const handleSave = () => {
    if (activeFilePath && fileContents[activeFilePath] !== undefined) {
      onSaveFile(activeFilePath, fileContents[activeFilePath]);
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 2000);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const newLogs = [...terminalHistory, `$ ${cmd}`];

    if (cmd === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      newLogs.push(
        'Available simulated commands: npm test, npm run qa:replay, git status, git diff, a2a ping, clear'
      );
    } else if (cmd === 'npm run qa:replay') {
      newLogs.push(
        '🚀 Executing 30x headless replay: qa/replays/kano_intake.yaml',
        '✔ [Step 1] Navigated to /cargo/intake (HTTP 200 in 12ms)',
        '✔ [Step 2] Filled waybill ID: KB-8921-99',
        '✔ [Step 3] Selected Kano Hub destination & parsed payment_mode: CASH',
        '✔ [Step 4] Asserted .receipt-preview-banner (14/14 checks passed, 0 tokens consumed)',
        '✨ Replay finished in 184ms with 0 failures.'
      );
    } else if (cmd === 'git diff') {
      newLogs.push(
        'diff --git a/src/modules/cargo/syncClient.ts b/src/modules/cargo/syncClient.ts',
        '+ const normalizedMode = event.payment_mode || event.receipt_mode;',
        '+ const idempotencyKey = `sync_${event.hub_id}_${event.waybill_id}_${event.timestamp}`;',
        '✔ Invariant: idempotency key enforced.'
      );
    } else if (cmd === 'git status') {
      newLogs.push(
        'On branch agent/fix-kano-hub-sync',
        'Changes to be committed: modified src/modules/cargo/syncClient.ts'
      );
    } else if (cmd === 'a2a ping') {
      newLogs.push('pong (Google ADK A2A socket latency: 0.8ms)');
    } else {
      newLogs.push(`bash: ${cmd}: command executed successfully (exit code 0)`);
    }

    setTerminalHistory(newLogs);
    setTerminalInput('');
  };

  const renderFileTree = (nodes: FileNode[]) => {
    return nodes.map((node) => {
      if (node.type === 'folder') {
        const isExpanded = Boolean(expandedFolders[node.path]);
        return (
          <div key={node.path} className="select-none">
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-850 hover:bg-slate-800/60 cursor-pointer text-xs text-slate-300 font-mono"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="pl-3.5 border-l border-slate-800 ml-2">
                {renderFileTree(node.children)}
              </div>
            )}
          </div>
        );
      }

      const isSelected = activeFilePath === node.path;
      return (
        <div
          key={node.path}
          onClick={() => handleSelectFile(node.path, node.content)}
          className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-xs font-mono transition-colors ${
            isSelected
              ? 'bg-cyan-950/60 text-cyan-300 border-l-2 border-cyan-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-cyan-500" />
          <span className="truncate">{node.name}</span>
        </div>
      );
    });
  };

  const currentCode = fileContents[activeFilePath] || '// Empty file';
  const lines = currentCode.split('\n');

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[780px]">
      {/* Top IDE Window Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-slate-400 border-l border-slate-800 pl-3">
            code-server · Embedded VS Code [Phase 7 IDE Integration]
          </span>
        </div>

        <div className="flex items-center gap-3">
          {savedNotification && (
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved to Workspace
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors flex items-center gap-1"
          >
            <Save className="w-3 h-3 text-cyan-400" />
            Save File
          </button>
        </div>
      </div>

      {/* Main IDE Workspace (Split Tree + Editor + Terminal) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Explorer Sidebar */}
        <div className="w-60 bg-slate-900/60 border-r border-slate-800 p-3 overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono text-slate-500 mb-2 font-semibold tracking-wider">
              Workspace Files
            </div>
            <div className="space-y-0.5">{renderFileTree(files)}</div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs font-mono text-slate-500">
            <span>Container: code-server:latest</span>
            <span className="block text-slate-600">Volume: /workspace (persistent)</span>
          </div>
        </div>

        {/* Center / Right Editor & Terminal View */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* File Tabs Bar */}
          <div className="flex items-center bg-slate-900/80 border-b border-slate-800 overflow-x-auto">
            {openFiles.map((path) => {
              const fileName = path.split('/').pop() || path;
              const isActive = activeFilePath === path;
              return (
                <div
                  key={path}
                  onClick={() => setActiveFilePath(path)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-mono border-r border-slate-800 cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 text-cyan-300 border-t-2 border-t-cyan-400'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{fileName}</span>
                  <button
                    onClick={(e) => handleCloseTab(path, e)}
                    className="hover:text-rose-400 ml-1 text-slate-500"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Code Editor Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers */}
            <div className="w-12 bg-slate-950 border-r border-slate-850 border-slate-900 py-3 text-right pr-3 select-none font-mono text-xs text-slate-600">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Text Area with syntax-like styling */}
            <div className="flex-1 relative overflow-auto p-3 bg-slate-950">
              <textarea
                value={currentCode}
                onChange={(e) => handleEditorChange(e.target.value)}
                spellCheck={false}
                className="w-full h-full bg-transparent font-mono text-xs text-slate-200 leading-6 resize-none focus:outline-none focus:ring-0 border-0 p-0 selection:bg-cyan-500/30 whitespace-pre"
              />
            </div>
          </div>

          {/* Integrated code-server Terminal */}
          <div className="h-44 bg-slate-950 border-t border-slate-800 flex flex-col font-mono text-xs">
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-semibold">Terminal</span>
                <span className="text-slate-500">bash (/workspace)</span>
              </div>
              <span className="text-slate-500">ADK Socket: ONLINE</span>
            </div>

            <div className="flex-1 p-2.5 overflow-y-auto space-y-1 text-slate-300">
              {terminalHistory.map((line, idx) => (
                <div
                  key={idx}
                  className={`${
                    line.startsWith('$')
                      ? 'text-cyan-400 font-semibold'
                      : line.startsWith('✔') || line.startsWith('✨')
                      ? 'text-emerald-400'
                      : line.startsWith('🚀')
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleTerminalSubmit}
              className="bg-slate-900/60 border-t border-slate-800 px-3 py-1.5 flex items-center gap-2"
            >
              <span className="text-cyan-400 font-bold">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="npm run qa:replay | git diff | a2a ping"
                className="flex-1 bg-transparent text-white focus:outline-none text-xs"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
