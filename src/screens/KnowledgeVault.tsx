import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../components/Toast';
import { useProjects } from '../hooks/useProjects';
import {
  LearningRecord,
  loadLearningVault,
  exportAsJSONL,
  exportAsSystemPrompt
} from '../lib/llmLearningStore';
import {
  Brain,
  Search,
  Copy,
  FileCode,
  CheckCircle2,
  Filter
} from 'lucide-react';

export const KnowledgeVaultScreen: React.FC = () => {
  const toast = useToast();
  const { projects } = useProjects();
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedFormat, setCopiedFormat] = useState<'jsonl' | 'markdown' | null>(null);

  useEffect(() => {
    setRecords(loadLearningVault());
  }, []);

  // Filter locally, case-insensitive, over title, rule, and project
  const filteredRecords = useMemo(() => {
    if (!filterQuery.trim()) return records;
    const q = filterQuery.toLowerCase().trim();
    return records.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchRule = (r.invariantRule || '').toLowerCase().includes(q);
      const matchProj = (r.projectName || '').toLowerCase().includes(q) || r.projectId.toLowerCase().includes(q);
      const matchFix = (r.verifiedFix || '').toLowerCase().includes(q);
      return matchTitle || matchRule || matchProj || matchFix;
    });
  }, [records, filterQuery]);

  const handleCopyJSONL = () => {
    const jsonl = exportAsJSONL(records);
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(jsonl);
      }
    } catch {}
    setCopiedFormat('jsonl');
    toast.success('Copied JSONL dataset');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleCopyMarkdown = () => {
    const md = exportAsSystemPrompt(records);
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(md);
      }
    } catch {}
    setCopiedFormat('markdown');
    toast.success('Copied Markdown prompt');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Knowledge
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Engineering post-mortems, verified fixes, and invariant rules for LLM context injection.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={handleCopyJSONL}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/10 text-cyan-400 font-bold transition-all flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            {copiedFormat === 'jsonl' ? 'Copied!' : 'Export JSONL'}
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/10 text-purple-300 font-bold transition-all flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedFormat === 'markdown' ? 'Copied!' : 'Copy Rules Prompt'}
          </button>
        </div>
      </div>

      {/* Filter Input */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#161b22] border border-white/10 text-xs font-mono">
        <Search className="w-4 h-4 text-emerald-400 shrink-0" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter lessons across title, invariant rule, or project..."
          className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none text-xs font-mono"
        />
        {filterQuery && (
          <button
            onClick={() => setFilterQuery('')}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Table of Rows (No cards) */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0d1117] border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-1/3">Lesson</th>
                <th className="py-3 px-4 w-1/4">Vertical</th>
                <th className="py-3 px-4 w-5/12">Invariant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No knowledge records match "{filterQuery}"
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#1c2333] transition-colors">
                    <td className="py-3.5 px-4 align-top space-y-1">
                      <span className="font-bold text-slate-100 font-sans text-xs block">
                        {r.title}
                      </span>
                      <p className="text-slate-400 font-sans text-[11px] line-clamp-2">
                        {r.symptomAndIssue}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <span className="text-emerald-400 font-bold block">{r.projectName}</span>
                      <span className="text-[10px] text-slate-500">{r.category}</span>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="p-2 rounded bg-[#0d1117] border border-white/5 text-amber-300 font-sans text-[11px] leading-relaxed">
                        "{r.invariantRule}"
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
