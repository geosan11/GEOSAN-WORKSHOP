import React, { useState, useMemo } from 'react';
import { Project } from '../lib/types';
import {
  DesignBrief,
  getDesignBrief,
  saveDesignBrief,
  approveDesignBrief,
  rejectDesignBrief,
  ReferenceItem
} from '../lib/designBrief';
import { VERTICAL_KITS, VerticalKit } from '../data/verticalKits';
import { lintDesignBriefAndFixture, SlopCriticResult } from '../lib/slopCritic';
import { getOrCreateGoldenFixture } from '../lib/goldenFixtures';
import { getCopyDeckForKit } from '../lib/copyDeck';
import { loadProjectDiscovery } from '../lib/sdlcDiscovery';
import { useToast } from './Toast';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pin,
  Sparkles,
  Layers,
  Terminal,
  FileCode2,
  ExternalLink,
  Ban,
  Check,
  X,
  Play,
  Copy,
  Lock,
  Eye,
  Sliders,
  Send,
  RefreshCw,
  Compass,
  FileCheck
} from 'lucide-react';

interface ReferenceBoardProps {
  project: Project;
  onDesignApproved?: () => void;
}

export const ReferenceBoard: React.FC<ReferenceBoardProps> = ({ project, onDesignApproved }) => {
  const toast = useToast();

  const [brief, setBrief] = useState<DesignBrief>(() => getDesignBrief(project.id, project.vertical));
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [activeSubView, setActiveSubView] = useState<'board' | 'critic' | 'fixture' | 'copy'>('board');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check Discovery phase 1 (golden path) and phase 2 (entities)
  const discovery = useMemo(() => loadProjectDiscovery(project.id), [project.id]);
  const hasGoldenPath = Boolean(
    discovery.answers['q1-1-persona-outcome'] ||
    discovery.answers['q1-3-golden-path-invariants'] ||
    project.agent_instructions
  );
  const hasEntities = Boolean(
    discovery.answers['q2-1-core-entities'] ||
    discovery.answers['q2-2-offline-queue-state'] ||
    project.agent_instructions
  );
  const discoveryGatePassed = hasGoldenPath && hasEntities;

  // Active Kit
  const activeKit = VERTICAL_KITS[brief.kit_id] || VERTICAL_KITS.ehi;

  // Golden Fixture
  const goldenFixture = useMemo(() => {
    return getOrCreateGoldenFixture(project.id, project.name, brief.kit_id);
  }, [project.id, project.name, brief.kit_id]);

  // Slop Critic Analysis
  const criticResult: SlopCriticResult = useMemo(() => {
    return lintDesignBriefAndFixture(brief, goldenFixture.html_content);
  }, [brief, goldenFixture.html_content]);

  // Copy Deck
  const copyDeck = useMemo(() => getCopyDeckForKit(brief.kit_id), [brief.kit_id]);

  // Update handler
  const handleUpdateBrief = (updater: (prev: DesignBrief) => DesignBrief) => {
    const next = updater(brief);
    setBrief(next);
    saveDesignBrief(next);
  };

  // Change reference item
  const handleUpdateReference = (index: number, field: keyof ReferenceItem, value: string) => {
    handleUpdateBrief((prev) => {
      const refs = [...prev.references];
      refs[index] = { ...refs[index], [field]: value };
      return { ...prev, references: refs };
    });
  };

  // Add forbidden item
  const [newForbiddenText, setNewForbiddenText] = useState('');
  const handleAddForbidden = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForbiddenText.trim()) return;
    handleUpdateBrief((prev) => ({
      ...prev,
      forbidden: [...prev.forbidden, newForbiddenText.trim()]
    }));
    setNewForbiddenText('');
    toast.success('Forbidden anti-pattern added to design contract.');
  };

  const handleRemoveForbidden = (index: number) => {
    handleUpdateBrief((prev) => ({
      ...prev,
      forbidden: prev.forbidden.filter((_, i) => i !== index)
    }));
  };

  // Approve brief
  const handleApprove = () => {
    if (!criticResult.passed) {
      toast.error('Cannot approve design brief: Slop Critic found blocker violations.');
      setActiveSubView('critic');
      return;
    }

    setIsProcessing(true);
    try {
      const res = approveDesignBrief(project.id, goldenFixture.fixture_hash);
      if (res.success) {
        setBrief(getDesignBrief(project.id));
        toast.success(`Design Brief & Fixture Approved! Hash: ${goldenFixture.fixture_hash}`);
        if (onDesignApproved) onDesignApproved();
      } else {
        toast.error(res.error || 'Failed to approve design brief.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject brief
  const handleRejectConfirm = () => {
    if (!rejectReasonInput.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    rejectDesignBrief(project.id, rejectReasonInput.trim());
    setBrief(getDesignBrief(project.id));
    setRejectModalOpen(false);
    setRejectReasonInput('');
    toast.error('Design brief rejected. CodingAgent builds will remain gated.');
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#e6edf3]">
      {/* ── TOP BANNER: STATUS & GATE NOTICE ── */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <Pin className="w-4 h-4 text-[#F0B230]" />
              Design Brief & Reference Board
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                brief.status === 'approved'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : brief.status === 'rejected'
                  ? 'bg-red-950 text-red-400 border-red-500/40'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40'
              }`}
            >
              Status: {brief.status.toUpperCase()}
            </span>
          </div>
          <p className="text-[#8b98a8] font-sans text-xs">
            Gate: <code className="text-[#FFBD59]">BUILD_FEATURE</code> and <code className="text-[#FFBD59]">FIX_BUG</code> tasks stay <code className="text-amber-300">proposed</code> until this design brief is formally approved with a signed golden fixture hash.
          </p>
        </div>

        {/* Approval / Rejection Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {brief.status !== 'approved' ? (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Approve Design Brief</span>
              </button>
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px]">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Signed Fixture: <strong className="font-mono">{brief.approved_fixture_hash}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Alert if rejected */}
      {brief.status === 'rejected' && brief.reject_reason && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block uppercase text-[10px] text-red-200">Rejection Reason Stored on Brief:</span>
            <span className="font-sans text-xs">{brief.reject_reason}</span>
          </div>
        </div>
      )}

      {/* ── DISCOVERY PREREQUISITE WARNING ── */}
      {!discoveryGatePassed && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block uppercase text-[10px] text-amber-300">
              Discovery Phase Invariant Check:
            </span>
            <p className="font-sans text-xs">
              Discovery Phase 1 (Golden Path) and Phase 2 (Entities) must be filled before the Golden Screen Fixture can be deployed to production.
            </p>
          </div>
        </div>
      )}

      {/* ── SUBVIEW TABS ── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveSubView('board')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            activeSubView === 'board'
              ? 'bg-[#F0B230] text-[#0A1420]'
              : 'text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>1. Three References & Brief</span>
        </button>

        <button
          onClick={() => setActiveSubView('critic')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            activeSubView === 'critic'
              ? 'bg-[#F0B230] text-[#0A1420]'
              : 'text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>2. Slop Critic ({criticResult.passed ? 'PASS' : `${criticResult.violations.length} MISSES`})</span>
        </button>

        <button
          onClick={() => setActiveSubView('fixture')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            activeSubView === 'fixture'
              ? 'bg-[#F0B230] text-[#0A1420]'
              : 'text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>3. Golden Screen Fixture</span>
        </button>

        <button
          onClick={() => setActiveSubView('copy')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            activeSubView === 'copy'
              ? 'bg-[#F0B230] text-[#0A1420]'
              : 'text-[#8b98a8] hover:text-[#e6edf3]'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>4. Copy Deck (10 Domain Nouns)</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SUBVIEW 1: REFERENCES BOARD & DESIGN BRIEF                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeSubView === 'board' && (
        <div className="space-y-6">
          {/* Vertical Kit Selection & Signature Object */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <label className="text-[11px] font-bold text-[#e6edf3] uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#F0B230]" />
                Selected Vertical Kit:
              </label>
              <select
                value={brief.kit_id}
                onChange={(e) => {
                  const newKitId = e.target.value as any;
                  const kit = VERTICAL_KITS[newKitId];
                  handleUpdateBrief((prev) => ({
                    ...prev,
                    kit_id: newKitId,
                    signature_object: kit.signatureObject,
                    setting: kit.setting,
                    forbidden: [...kit.defaultForbidden]
                  }));
                }}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              >
                <option value="iyanuoluwa">Bulk Materials & Weighbridge Kit (Ticket Tape WB-YYYY-XXXXX)</option>
                <option value="ehi">Reconciliation Ledger & Debt Line Kit (Audit Stamp & Aging Buckets)</option>
                <option value="aviation">Technical Flight Logbook Kit (Hobbs Decimals & A&P Signoff)</option>
                <option value="edgepoint">IoT Sensor Mesh & Telemetry Kit (Node RSSI & Voltage)</option>
              </select>

              <div className="p-3 rounded-lg bg-[#0d1117] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Screen Grammar:</span>
                <span className="text-xs text-slate-300 font-sans">{activeKit.screenGrammar}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <label className="text-[11px] font-bold text-[#e6edf3] uppercase flex items-center justify-between">
                <span>Signature Object (Operator Holds):</span>
                <span className="text-[10px] text-amber-400">Never "Dashboard"</span>
              </label>
              <input
                type="text"
                value={brief.signature_object}
                onChange={(e) => handleUpdateBrief((p) => ({ ...p, signature_object: e.target.value }))}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              />

              <div className="space-y-1">
                <label className="text-[10px] text-[#8b98a8] uppercase block">
                  Setting & Operating Context (Lighting, Gloves, Distance):
                </label>
                <textarea
                  value={brief.setting}
                  onChange={(e) => handleUpdateBrief((p) => ({ ...p, setting: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3] font-sans focus:outline-none focus:border-[#F0B230]"
                />
              </div>
            </div>
          </div>

          {/* EXACTLY THREE REFERENCES (PINNED) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-[#F0B230]" />
                Pinned References (Exactly Three Required)
              </h3>
              <span className="text-[10px] text-[#8b98a8]">
                Every pin must contain both "what to steal" and "what to leave"
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {brief.references.map((ref, idx) => (
                <div key={ref.id || idx} className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#FFBD59] uppercase">
                      Reference #{idx + 1}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#8b98a8]">
                      PINNED
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8b98a8] uppercase block">Source / Archive:</label>
                    <input
                      type="text"
                      value={ref.source}
                      onChange={(e) => handleUpdateReference(idx, 'source', e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded p-2 text-xs text-[#e6edf3] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-emerald-400 uppercase font-bold block">
                      ✓ What to Steal (One Sentence):
                    </label>
                    <textarea
                      value={ref.what_to_steal}
                      onChange={(e) => handleUpdateReference(idx, 'what_to_steal', e.target.value)}
                      rows={2}
                      className="w-full bg-[#0d1117] border border-emerald-500/20 rounded p-2 text-xs text-slate-200 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-red-400 uppercase font-bold block">
                      ✗ What to Leave:
                    </label>
                    <textarea
                      value={ref.what_to_leave}
                      onChange={(e) => handleUpdateReference(idx, 'what_to_leave', e.target.value)}
                      rows={2}
                      className="w-full bg-[#0d1117] border border-red-500/20 rounded p-2 text-xs text-slate-200 font-sans"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORBIDDEN LIST (MINIMUM FIVE) */}
          <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-red-400" />
                Forbidden Anti-Patterns ({brief.forbidden.length} Listed — Minimum 5 Required)
              </h3>
              <span className="text-[10px] text-[#8b98a8]">
                CodingAgent will be rejected if these patterns are detected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {brief.forbidden.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#0d1117] border border-red-500/20 text-red-200 flex items-center justify-between gap-2"
                >
                  <span className="font-sans text-xs truncate">🚫 {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveForbidden(idx)}
                    className="text-[#8b98a8] hover:text-red-400 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddForbidden} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newForbiddenText}
                onChange={(e) => setNewForbiddenText(e.target.value)}
                placeholder="e.g. Generic onboarding carousels, celebratory toast confetti..."
                className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3] font-sans"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold"
              >
                Add Forbidden
              </button>
            </form>
          </div>

          {/* TYPE, VOICE & TOKEN DELTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <h4 className="text-[11px] font-bold uppercase text-[#e6edf3]">
                Typography & Voice Invariants
              </h4>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-[#8b98a8] block">DISPLAY:</span>
                  <span className="font-bold text-white">{brief.type_and_voice.display_face}</span>
                </div>
                <div>
                  <span className="text-[#8b98a8] block">BODY:</span>
                  <span className="font-bold text-white">{brief.type_and_voice.text_face}</span>
                </div>
                <div>
                  <span className="text-[#8b98a8] block">MONO:</span>
                  <span className="font-bold text-white">{brief.type_and_voice.mono_face}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Sample Domain Copy Strings:</span>
                {brief.type_and_voice.sample_strings.map((str, i) => (
                  <div key={i} className="p-2 rounded bg-[#0d1117] border border-white/5 text-[11px] font-mono text-[#FFBD59]">
                    "{str}"
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              <h4 className="text-[11px] font-bold uppercase text-[#e6edf3]">
                Token Delta (Overrides from Workshop Tokens)
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#8b98a8] block">ACCENT COLOR:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-5 h-5 rounded border border-white/20" style={{ background: brief.token_delta.accent_color }} />
                    <span className="font-mono">{brief.token_delta.accent_color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#8b98a8] block">PAPER BACKGROUND:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-5 h-5 rounded border border-white/20" style={{ background: brief.token_delta.paper_color }} />
                    <span className="font-mono">{brief.token_delta.paper_color}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[10px] text-[#8b98a8] block">INTERFACE DENSITY:</label>
                <span className="px-2.5 py-1 rounded bg-[#0d1117] border border-white/10 font-bold text-white text-[11px] mt-1 inline-block">
                  {brief.token_delta.density.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SUBVIEW 2: SLOP CRITIC (DETERMINISTIC ZERO-COST LINTER)          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeSubView === 'critic' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400" />
                Deterministic Slop Critic Analysis
              </h3>
              <p className="text-xs text-[#8b98a8] font-sans">
                Zero-model-spend design verification. Fails the brief if stat cards, gradients, buzzwords, or generic sidebars are present.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Compliance Score</span>
                <span className={`text-2xl font-bold font-mono ${criticResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {criticResult.score}%
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                  criticResult.passed
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-950 text-red-300 border-red-500/40'
                }`}
              >
                {criticResult.passed ? 'ALL INVARIANTS PASS' : 'BLOCKERS DETECTED'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {criticResult.violations.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <span className="font-bold text-sm block">Clean Industrial Design Brief</span>
                <p className="text-xs text-emerald-400/80 font-sans max-w-md mx-auto">
                  Zero generic stat cards, zero buzzwords, grounded display typography, and three validated domain references.
                </p>
              </div>
            ) : (
              criticResult.violations.map((v, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 flex items-start gap-3"
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-red-200 block">
                      [{v.code}] {v.title}
                    </span>
                    <p className="text-xs text-red-300/90 font-sans">{v.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SUBVIEW 3: GOLDEN SCREEN FIXTURE (ONE HTML FILE)                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeSubView === 'fixture' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#F0B230]" />
                Golden Screen Fixture (design/{goldenFixture.project_slug}/golden.html)
              </h3>
              <p className="text-xs text-[#8b98a8] font-sans mt-0.5">
                Shows the signature object with real contract fields. Approval writes <code className="text-[#FFBD59]">{goldenFixture.fixture_hash}</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8b98a8] font-mono">
                Hash: {goldenFixture.fixture_hash}
              </span>
            </div>
          </div>

          {/* Embedded Fixture Viewport */}
          <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black">
            <div className="bg-[#161b22] px-4 py-2 border-b border-white/5 flex items-center justify-between text-[11px] text-[#8b98a8]">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono">golden.html · Signature Object Runtime</span>
              </span>
              <span className="text-emerald-400 font-bold font-mono">100% Contract Compliant</span>
            </div>

            <iframe
              srcDoc={goldenFixture.html_content}
              title="Golden Screen Fixture Viewport"
              className="w-full h-[520px] bg-black border-none"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SUBVIEW 4: COPY DECK (10 DOMAIN CONTRACT NOUNS)                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeSubView === 'copy' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#161b22] border border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#F0B230]" />
              Ten Domain Contract Nouns (Gating CodingAgent & Chat)
            </h3>
            <p className="text-xs text-[#8b98a8] font-sans mt-0.5">
              Chat and plan prompts must use these nouns. A plan that says "user" and "item" where contract says <code>{copyDeck[0].noun}</code> and <code>{copyDeck[1].noun}</code> is rejected in Ask mode.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {copyDeck.map((entry, idx) => (
              <div key={entry.noun} className="p-3.5 rounded-xl bg-[#161b22] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#FFBD59] font-mono">
                    #{idx + 1} · {entry.noun}
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-cyan-300">
                    {entry.category}
                  </span>
                </div>
                <p className="text-xs text-[#8b98a8] font-sans">{entry.definition}</p>
                <div className="p-1.5 rounded bg-[#0d1117] text-[11px] font-mono text-emerald-400">
                  Example: {entry.sampleString}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#161b22] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="font-bold text-sm text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Reject Design Brief
              </span>
              <button onClick={() => setRejectModalOpen(false)} className="text-[#8b98a8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300 font-sans">
              Enter the reason for rejection. This reason will be stored directly on the design brief record and blocks any <code>BUILD_FEATURE</code> tasks until resolved.
            </p>

            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              rows={4}
              placeholder="e.g. Reference #2 has no valid 'what to leave'; Golden fixture contains marketing cards..."
              className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-sans focus:outline-none focus:border-red-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-[#8b98a8] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
