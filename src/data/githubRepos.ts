/**
 * Demo GitHub repository catalog for Factory-style enable/search picker.
 * Quota mirrors Steel/Factory refero: Enabled N / 25.
 */

export const GITHUB_REPO_QUOTA = 25;

export interface GitHubCatalogRepo {
    id: string;
    fullName: string;
    description: string;
    private: boolean;
    defaultBranch: string;
    updatedAt: string;
}

const STORAGE_KEY = 'geosan_enabled_github_repos';

/** Curated catalog spanning the four GEOSAN verticals + a few extras to search. */
export const GITHUB_REPO_CATALOG: GitHubCatalogRepo[] = [
    {
        id: 'repo-ledger-core',
        fullName: 'ehi-enterprise/ledger-core',
        description: 'Settlement ledger, kobo invariants, hub RLS',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2026-10-03T08:00:00Z',
    },
    {
        id: 'repo-cargo-v2',
        fullName: 'ehi-enterprise/cargo-platform-v2',
        description: 'Cargo intake, AWB tags, offline sync',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2026-10-02T12:00:00Z',
    },
    {
        id: 'repo-crushing',
        fullName: 'iyanu-processing/crushing-telemetry',
        description: 'Scale-house tablets and Bluetooth weighbridge',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2026-10-01T09:30:00Z',
    },
    {
        id: 'repo-silo',
        fullName: 'iyanu-agrik/silo-monitoring-engine',
        description: 'Silo temperature and humidity probes',
        private: true,
        defaultBranch: 'develop',
        updatedAt: '2026-09-28T16:00:00Z',
    },
    {
        id: 'repo-efb',
        fullName: 'skyfleet-ops/electronic-flight-bag',
        description: 'FAA part 121 EFB and pilot signatures',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2026-10-03T06:15:00Z',
    },
    {
        id: 'repo-turnaround',
        fullName: 'aero-ground/turnaround-orchestrator',
        description: 'Ground turnaround task orchestration',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2026-09-30T11:00:00Z',
    },
    {
        id: 'repo-sensor',
        fullName: 'edgepoint-mesh/sensor-daemon',
        description: 'MQTT edge telemetry under 45ms',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2026-10-03T07:45:00Z',
    },
    {
        id: 'repo-settlement-edge',
        fullName: 'edgepoint-core/settlement-ledger',
        description: 'Edge settlement micro-ledger',
        private: true,
        defaultBranch: 'main',
        updatedAt: '2026-09-25T14:20:00Z',
    },
    {
        id: 'repo-awesome',
        fullName: 'geosan-ops/awesome-runbooks',
        description: 'Operator runbooks and incident playbooks',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2026-09-20T10:00:00Z',
    },
    {
        id: 'repo-od',
        fullName: 'geosan-ops/od-harness',
        description: 'Deterministic budget and CI harness',
        private: false,
        defaultBranch: 'main',
        updatedAt: '2026-10-02T18:00:00Z',
    },
];

export function catalogUrl(fullName: string): string {
    return `https://github.com/${fullName}`;
}

const DEFAULT_ENABLED = ['repo-ledger-core'];

function knownCatalogIds(): Set<string> {
    return new Set(GITHUB_REPO_CATALOG.map((r) => r.id));
}

/** Drop unknown ids and cap at quota. Returns null when input was already clean. */
export function sanitizeEnabledRepoIds(ids: string[]): string[] {
    const known = knownCatalogIds();
    const cleaned: string[] = [];
    for (const id of ids) {
        if (typeof id !== 'string') continue;
        if (!known.has(id)) continue;
        if (cleaned.includes(id)) continue;
        cleaned.push(id);
        if (cleaned.length >= GITHUB_REPO_QUOTA) break;
    }
    return cleaned;
}

export function loadEnabledRepoIds(): string[] {
    if (typeof window === 'undefined') return [...DEFAULT_ENABLED];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            // Default: enable the primary EHI ledger repo (Factory 1/25 start state).
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED));
            return [...DEFAULT_ENABLED];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED));
            return [...DEFAULT_ENABLED];
        }
        const cleaned = sanitizeEnabledRepoIds(parsed.filter((x) => typeof x === 'string'));
        // Persist repair when storage had junk / unknown ids / over-quota.
        if (cleaned.length !== parsed.length || cleaned.some((id, i) => id !== parsed[i])) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
    } catch {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED));
        return [...DEFAULT_ENABLED];
    }
}

export function saveEnabledRepoIds(ids: string[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeEnabledRepoIds(ids)));
}

export function filterCatalog(query: string, catalog: GitHubCatalogRepo[] = GITHUB_REPO_CATALOG): GitHubCatalogRepo[] {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
        (r) =>
            r.fullName.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
    );
}
