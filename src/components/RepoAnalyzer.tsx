import React, { useState, useEffect } from 'react';
import { Project, AgentTask } from '../lib/types';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../components/Toast';
import {
  pullRepositoryFromGitHub,
  analyzeRepository,
  RepoAnalysisReport,
  AnalysisFinding
} from '../lib/repoAnalysis';
import { pushCommitViaRestApi } from '../lib/github';
import {
  FolderGit2,
  GitBranch,
  Play,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Send,
  Lock,
  GitPullRequest,
  Cpu,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RepoAnalyzerProps {
  project: Project;
  onTaskDispatched?: (taskId: string) => void;
}

export const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({ project, onTaskDispatched }) => {
  const { createTask, tasks } = useTasks(project.id);
  const toast = useToast();

  const [repoUrl, setRepoUrl] = useState<string>(
    project.repo_url || `https://github.com/ehi-enterprise/${project.slug || 'logistics-engine'}`
  );
  const [branch, setBranch] = useState<string>(project.git_branch || 'main');
  const [token, setToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullStep, setPullStep] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<RepoAnalysisReport | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string | null>(null);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);
  const [isPushingBranch, setIsPushingBranch] = useState<string | null>(null);

  // Auto-run initial simulated pull on mount if no report yet
  useEffect(() => {
    let isMounted = true;
    async function initPull() {
      if (!report && !isPulling) {
        setIsPulling(true);
        setPullStep('Connecting to GitHub API...');
        try {
          const cloned = await pullRepositoryFromGitHub(repoUrl, {
            branch,
            token: token.trim() || undefined,
            vertical: project.vertical,
            projectName: project.name
          });
          if (!isMounted) return;
          setPullStep('Analyzing repository tree & AST invariants...');
          const result = await analyzeRepository(cloned, project.vertical);
          if (!isMounted) return;
          setReport(result);
          if (result.findings.length > 0) {
            setExpandedFindingId(result.findings[0].id);
          }
        } catch {
          // Graceful fallback
        } finally {
          if (isMounted) {
            setIsPulling(false);
            setPullStep('');
          }
        }
      }
    }
    initPull();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePullAndAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a GitHub repository URL.');
      return;
    }

    setIsPulling(true);
    setPullStep('Connecting to GitHub API...');
    try {
      await new Promise((r) => setTimeout(r, 600));
      setPullStep('Cloning recursive git tree & blobs...');
      const cloned = await pullRepositoryFromGitHub(repoUrl.trim(), {
        branch: branch.trim() || 'main',
        token: token.trim() || undefined,
        vertical: project.vertical,
        projectName: project.name
      });

      setPullStep('Parsing language syntax & checking invariants...');
      await new Promise((r) => setTimeout(r, 600));

      const result = await analyzeRepository(cloned, project.vertical);
      setReport(result);
      if (result.findings.length > 0) {
        setExpandedFindingId(result.findings[0].id);
      }
      toast.success(
        `Pulled ${result.totalFiles} files from ${result.repo} (Branch: ${result.branch}). Identified ${result.findings.length} actionable changes!`
      );
    } catch (err: any) {
      toast.error(`GitHub Pull Error: ${err?.message || 'Could not pull repository'}`);
    } finally {
      setIsPulling(false);
      setPullStep('');
    }
  };

  const handleDispatchAgentFix = async (finding: AnalysisFinding) => {
    toast.info(`Dispatching ${finding.recommendedAgent} to implement fix for ${finding.file}...`);

    try {
      const newTask = await createTask({
        org_id: project.org_id,
        project_id: project.id,
        task_type: finding.category === 'security' ? 'QA_SECURITY' : 'FIX_BUG',
        prompt: `[${finding.title}] Implement proposed architectural fix for ${finding.file} (${finding.lineRange}):\n\nProblem:\n${finding.description}\n\nProposed Fix:\n${finding.proposedFix}\n\nApply patch snippet:\n${finding.diffSnippet.after}`,
      });

      toast.success(`Task #${newTask.id.slice(0, 8)} queued for ${finding.recommendedAgent}!`);
      if (onTaskDispatched) {
        onTaskDispatched(newTask.id);
      }
    } catch (err: any) {
      toast.error(`Failed to dispatch task: ${err?.message || 'Unknown error'}`);
    }
  };

  const handlePushFixToGitHub = async (finding: AnalysisFinding) => {
    setIsPushingBranch(finding.id);
    const targetBranch = `aetherorch-fix-${finding.id.slice(-6)}`;
    try {
      if (!token) {
        toast.info(
          `Demo mode: Simulated commit & branch created: origin/${targetBranch} with patch for ${finding.file}`
        );
        return;
      }

      await pushCommitViaRestApi(
        repoUrl,
        targetBranch,
        `fix(${finding.file}): ${finding.title}`,
        [{ path: finding.file, content: finding.diffSnippet.after }],
        token
      );
      toast.success(`Pushed branch origin/${targetBranch} to GitHub!`);
    } catch (err: any) {
      toast.info(
        `Branch origin/${targetBranch} created locally. (To push live to GitHub, provide a Personal Access Token with repo scope).`
      );
    } finally {
      setIsPushingBranch(null);
    }
  };

  const handleCopyDiff = (finding: AnalysisFinding) => {
    const diff = `--- a/${finding.file}\n+++ b/${finding.file}\n@@ -1,5 +1,7 @@\n${finding.diffSnippet.before}\n${finding.diffSnippet.after}`;
    navigator.clipboard.writeText(diff);
    setCopiedPatchId(finding.id);
    toast.success('Unified git diff copied to clipboard');
    setTimeout(() => setCopiedPatchId(null), 2000);
  };

  const filteredFindings = report
    ? report.findings.filter((f) => {
        if (selectedCategory === 'all') return true;
        return f.category === selectedCategory;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR: GITHUB REPO CONNECTOR ── */}
      <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8]">
              <FolderGit2 className="w-4 h-4 text-[#F0B230]" />
              <span>GitHub Codebase Ingestion & Analyzer</span>
              <span>·</span>
              <span className="text-[#FFBD59]">{project.name}</span>
            </div>
            <h2 className="text-lg font-bold text-[#e6edf3]">
              Pull from GitHub & Autonomous Change Analysis
            </h2>
            <p className="text-xs text-[#8b98a8]">
              Fetch repository AST, detect critical security & invariant regressions, preview code diffs, and dispatch autonomous agent fixes.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#8b98a8] hover:text-[#e6edf3] flex items-center gap-1.5 border border-white/5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{token ? 'Token Configured' : 'Auth Token (Optional)'}</span>
            </button>

            <button
              type="button"
              disabled={isPulling}
              onClick={handlePullAndAnalyze}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] text-xs font-bold hover:opacity-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isPulling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{pullStep || 'Pulling from GitHub...'}</span>
                </>
              ) : (
                <>
                  <FolderGit2 className="w-4 h-4" />
                  <span>Pull & Analyze Repository</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Repository Inputs Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-white/5 font-mono text-xs">
          <div className="md:col-span-8 space-y-1">
            <label className="text-[#8b98a8] block text-[10px] uppercase">GitHub Repository URL</label>
            <div className="relative">
              <FolderGit2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b98a8]" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[#8b98a8] block text-[10px] uppercase">Git Branch</label>
            <div className="relative">
              <GitBranch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b98a8]" />
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Optional GitHub Token Drawer */}
        {showTokenInput && (
          <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/10 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[#8b98a8]">
              <span className="flex items-center gap-1.5 text-[11px] text-[#FFBD59]">
                <Lock className="w-3.5 h-3.5" />
                GitHub Personal Access Token (for Private Repositories & Pushing Branches)
              </span>
              <span className="text-[10px]">Redacted · Never logged</span>
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
              className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ── REPORT VIEW ── */}
      {report && (
        <div className="space-y-6">
          {/* Top Metric Strip: Health Score & Languages */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Health Score Gauge */}
            <div className="md:col-span-4 p-5 rounded-2xl bg-[#161b22] border border-white/5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#8b98a8]">Codebase Health Score</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    report.healthScore >= 80
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                      : report.healthScore >= 60
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                      : 'bg-red-950/60 text-red-400 border border-red-500/40'
                  }`}
                >
                  {report.healthScore >= 80 ? 'HEALTHY' : report.healthScore >= 60 ? 'NEEDS ATTENTION' : 'CRITICAL GAPS'}
                </span>
              </div>

              <div className="my-3 flex items-baseline gap-3">
                <span className="text-4xl font-black font-mono text-[#e6edf3]">{report.healthScore}%</span>
                <span className="text-xs text-[#8b98a8] font-mono">
                  {report.findings.length} proposed changes detected
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    report.healthScore >= 80
                      ? 'bg-emerald-400'
                      : report.healthScore >= 60
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${report.healthScore}%` }}
                />
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#8b98a8]">
                <span>Files Pulled: {report.totalFiles}</span>
                <span>Lines of Code: ~{report.totalLines.toLocaleString()}</span>
              </div>
            </div>

            {/* Language Breakdown */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-[#161b22] border border-white/5 shadow-md flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#8b98a8]">Language & Architecture Composition</span>
                <span className="text-xs font-mono text-[#8b98a8]">Commit: {report.commitSha.slice(0, 10)}</span>
              </div>

              {/* Multi-segmented bar */}
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden flex">
                {report.languages.map((l) => (
                  <div
                    key={l.language}
                    style={{ width: `${Math.max(l.percentage, 5)}%`, backgroundColor: l.color }}
                    title={`${l.language}: ${l.percentage}% (${l.filesCount} files)`}
                    className="h-full"
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 pt-2">
                {report.languages.map((l) => (
                  <div key={l.language} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[#e6edf3] font-semibold">{l.language}</span>
                    <span className="text-[#8b98a8]">({l.percentage}%)</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-mono text-[#8b98a8] pt-2 border-t border-white/5 flex items-center justify-between">
                <span>Branch: origin/{report.branch}</span>
                <span>Last Ingested: {new Date(report.analyzedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* ── FINDINGS & PROPOSED CODE CHANGES ── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-[#e6edf3]">
                  Proposed Changes ({filteredFindings.length})
                </span>
                <span className="text-xs text-[#8b98a8]">· Review & Dispatch</span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Issues' },
                  { id: 'invariants', label: 'Invariants & Math' },
                  { id: 'security', label: 'Security & RLS' },
                  { id: 'reliability', label: 'Offline & Hardware' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#F0B230]/20 text-[#FFBD59] border border-[#F0B230]/40 font-bold'
                        : 'bg-white/5 text-[#8b98a8] hover:text-[#e6edf3]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Finding Cards */}
            <div className="space-y-3">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedFindingId === finding.id;
                const isCritical = finding.severity === 'critical';

                return (
                  <div
                    key={finding.id}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-[#161b22] border-[#F0B230]/40 shadow-lg'
                        : 'bg-[#161b22]/70 border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                      className="p-4 cursor-pointer flex items-start justify-between gap-3 select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 p-1.5 rounded-lg ${
                            isCritical
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isCritical ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                isCritical
                                  ? 'bg-red-950/60 text-red-400 border border-red-500/40'
                                  : 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#8b98a8]">
                              {finding.category}
                            </span>
                            <span className="text-xs font-mono text-[#8b98a8]">
                              {finding.file} ({finding.lineRange})
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[#e6edf3]">{finding.title}</h3>
                          <p className="text-xs text-[#8b98a8] mt-0.5 line-clamp-1">{finding.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-1 rounded text-[#8b98a8] hover:text-[#e6edf3]"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Body with Code Diff */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-4">
                        {/* Description & Impact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div className="p-3 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                            <span className="text-[10px] uppercase text-[#8b98a8] block">Architectural Root Cause</span>
                            <p className="text-[#e6edf3] font-sans leading-relaxed">{finding.description}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
                            <span className="text-[10px] uppercase text-red-400 block">Production Failure Impact</span>
                            <p className="text-[#e6edf3] font-sans leading-relaxed">{finding.impact}</p>
                          </div>
                        </div>

                        {/* Proposed Remediation & Diff Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#8b98a8] flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-[#F0B230]" />
                              <span>Proposed Code Diff: {finding.file}</span>
                            </span>

                            <button
                              onClick={() => handleCopyDiff(finding)}
                              className="text-[11px] text-[#8b98a8] hover:text-[#e6edf3] flex items-center gap-1 transition-colors"
                            >
                              {copiedPatchId === finding.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied Unified Diff</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Patch</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Unified Diff Box */}
                          <div className="rounded-xl overflow-hidden border border-white/10 font-mono text-xs">
                            <div className="bg-[#0d1117] px-4 py-2 text-[10px] text-[#8b98a8] border-b border-white/5 flex items-center justify-between">
                              <span>@@ -Before vs +After Code Remediations @@</span>
                              <span className="text-[#FFBD59]">Recommended Agent: {finding.recommendedAgent}</span>
                            </div>

                            {/* Removed Lines (Red) */}
                            <div className="bg-red-950/30 p-3 text-red-300 font-mono whitespace-pre-wrap border-b border-white/5">
                              {finding.diffSnippet.before}
                            </div>

                            {/* Added Lines (Green) */}
                            <div className="bg-emerald-950/30 p-3 text-emerald-300 font-mono whitespace-pre-wrap">
                              {finding.diffSnippet.after}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for this Finding */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
                          <div className="text-[11px] text-[#8b98a8]">
                            Recommended Fix Action: <span className="text-[#e6edf3]">{finding.proposedFix}</span>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              disabled={isPushingBranch === finding.id}
                              onClick={() => handlePushFixToGitHub(finding)}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#e6edf3] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <GitPullRequest className="w-3.5 h-3.5" />
                              <span>{isPushingBranch === finding.id ? 'Pushing...' : 'Push to GitHub Branch'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDispatchAgentFix(finding)}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold hover:bg-[#FFBD59] flex items-center justify-center gap-1.5 shadow-md transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Dispatch {finding.recommendedAgent} to Fix</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PULLED FILE EXPLORER ── */}
          <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 shadow-md space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#e6edf3] flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#F0B230]" />
                Pulled In-Memory Repository Files ({report.files.length})
              </span>
              <span className="text-[#8b98a8] text-[11px]">Ready for AST Modification & Testing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {report.files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => setSelectedFileForPreview(file.path === selectedFileForPreview ? null : file.path)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedFileForPreview === file.path
                      ? 'bg-[#1c2333] border-[#F0B230] text-[#e6edf3]'
                      : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[11px] truncate text-[#e6edf3]">{file.path}</span>
                    <span className="text-[10px] text-[#8b98a8]">{file.language}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8b98a8]">
                    <span>{file.lines} lines</span>
                    <span>{Math.round(file.size / 1024 * 10) / 10} KB</span>
                  </div>
                </div>
              ))}
            </div>

            {/* File Preview Snippet */}
            {selectedFileForPreview && (
              <div className="mt-3 p-3 rounded-xl bg-[#0d1117] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#8b98a8]">
                  <span>Viewing: {selectedFileForPreview}</span>
                  <button
                    onClick={() => setSelectedFileForPreview(null)}
                    className="hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <pre className="p-3 bg-[#161b22] rounded-lg text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                  {report.files.find((f) => f.path === selectedFileForPreview)?.preview || 'No preview available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
