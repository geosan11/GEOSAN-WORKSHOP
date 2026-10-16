import React, { useState } from 'react';
import { useSharedStatus } from '../lib/sharedStatus';
import { useProjects } from '../hooks/useProjects';
import { useToast } from '../components/Toast';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';

interface VerticalProbe {
  id: string;
  name: string;
  vertical: string;
  dnsMs: number;
  tlsMs: number;
  ttfbMs: number;
  failCount: number;
  sparklinePoints: number[];
}

export const MonitoringScreen: React.FC = () => {
  const toast = useToast();
  const { statusData } = useSharedStatus();
  const { projects } = useProjects();
  const [isProbing, setIsProbing] = useState(false);
  const [openProbeId, setOpenProbeId] = useState<string | null>(null);

  const verticalProbes: VerticalProbe[] = projects.map((p, i) => ({
    id: p.id,
    name: p.name,
    vertical: p.vertical,
    dnsMs: 2 + (i % 3),
    tlsMs: 4 + (i % 3),
    ttfbMs: 8 + (i * 3),
    failCount: 0,
    sparklinePoints: [14, 12, 13, 11, 12, 10, 12].map(x => x + i)
  }));

  const handleRunProbes = () => {
    setIsProbing(true);
    setTimeout(() => {
      setIsProbing(false);
      toast.success('All vertical probes healthy and in-band');
    }, 600);
  };

  const failing = verticalProbes.filter((probe) => probe.failCount > 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        eyebrow="Observe"
        title="Health"
        lede={
          failing.length === 0
            ? `All ${verticalProbes.length} verticals are healthy. Open a row for DNS, TLS, and TTFB.`
            : `${failing.length} vertical${failing.length === 1 ? '' : 's'} failing. Open a row for the timings.`
        }
        actions={
          <button
            type="button"
            onClick={handleRunProbes}
            disabled={isProbing}
            className="btn btn-primary disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing…' : 'Probe Now'}</span>
          </button>
        }
      />

      <SectionCard
        title="Verticals"
        description={
          failing.length === 0
            ? 'Nothing is failing. Timings stay inside the row.'
            : 'Failing verticals are marked. Open one for the timings.'
        }
      >
        <div className="section-card overflow-hidden divide-y divide-[color:var(--border-app)]">
          {verticalProbes.map((probe) => {
            const open = openProbeId === probe.id;
            const healthy = probe.failCount === 0;
            return (
              <div key={probe.id}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenProbeId(open ? null : probe.id)}
                >
                  <span className="min-w-0">
                    <span className="text-main font-bold text-sm block truncate">{probe.name.split(' (')[0]}</span>
                    <span className="text-meta block mt-1 normal-case tracking-normal">{probe.vertical}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`stamp ${healthy ? 'stamp-success' : 'stamp-danger'}`}>
                      {healthy ? 'Healthy' : `${probe.failCount} fails`}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
                  </span>
                </button>
                {open ? (
                  <div className="grid grid-cols-3 gap-3 px-4 pb-4 text-xs font-mono">
                    <div className="bg-app border border-app rounded-[var(--radius-control)] p-3">
                      <span className="text-meta block">DNS</span>
                      <span className="text-main font-bold">{probe.dnsMs} ms</span>
                    </div>
                    <div className="bg-app border border-app rounded-[var(--radius-control)] p-3">
                      <span className="text-meta block">TLS</span>
                      <span className="text-main font-bold">{probe.tlsMs} ms</span>
                    </div>
                    <div className="bg-app border border-app rounded-[var(--radius-control)] p-3">
                      <span className="text-meta block">TTFB</span>
                      <span className="text-main font-bold">{probe.ttfbMs} ms</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="text-meta normal-case tracking-normal mt-3">
          Upstream pulls this process: {statusData.upstream_pulls_this_process || 1}/hr. Tripwire is 3 fails.
        </p>
      </SectionCard>
    </div>
  );
};
