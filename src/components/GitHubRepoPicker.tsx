import React, { useMemo, useState } from 'react';
import { ExternalLink, Lock, Search, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import {
    GITHUB_REPO_CATALOG,
    GITHUB_REPO_QUOTA,
    GitHubCatalogRepo,
    catalogUrl,
    filterCatalog,
    loadEnabledRepoIds,
    saveEnabledRepoIds,
} from '../data/githubRepos';
import { useToast } from './Toast';

interface GitHubRepoPickerProps {
    /** Product label shown in “Enable repositories for …” */
    productName?: string;
    /** Fires after enable/disable with enabled set + the repo just toggled. */
    onEnabledChange?: (enabled: GitHubCatalogRepo[], toggled: GitHubCatalogRepo, enabledNow: boolean) => void;
    /** Prefer selecting this fullName when present in the catalog. */
    preferredFullName?: string | null;
}

export const GitHubRepoPicker: React.FC<GitHubRepoPickerProps> = ({
    productName = 'AetherOrch',
    onEnabledChange,
    preferredFullName,
}) => {
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [enabledIds, setEnabledIds] = useState<string[]>(() => loadEnabledRepoIds());

    const enabledCount = enabledIds.length;
    const filtered = useMemo(() => filterCatalog(query), [query]);

    const emitChange = (nextIds: string[], toggled: GitHubCatalogRepo, enabledNow: boolean) => {
        setEnabledIds(nextIds);
        saveEnabledRepoIds(nextIds);
        const enabled = GITHUB_REPO_CATALOG.filter((r) => nextIds.includes(r.id));
        onEnabledChange?.(enabled, toggled, enabledNow);
    };

    const toggleRepo = (repo: GitHubCatalogRepo) => {
        const isOn = enabledIds.includes(repo.id);
        if (isOn) {
            emitChange(enabledIds.filter((id) => id !== repo.id), repo, false);
            toast.info(`Disabled ${repo.fullName}`);
            return;
        }
        if (enabledIds.length >= GITHUB_REPO_QUOTA) {
            toast.error(`Repository quota reached (${GITHUB_REPO_QUOTA}). Disable one to enable another.`);
            return;
        }
        emitChange([...enabledIds, repo.id], repo, true);
        toast.success(`Enabled ${repo.fullName}`);
    };

    const handleManagePermissions = () => {
        toast.info('Open GitHub App permissions in a new tab (demo).');
        window.open('https://github.com/settings/installations', '_blank', 'noopener,noreferrer');
    };

    // Highlight preferred repo at top of results when searching empty.
    const ordered = useMemo(() => {
        if (query.trim() || !preferredFullName) return filtered;
        const pref = preferredFullName.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '');
        return [...filtered].sort((a, b) => {
            const aHit = a.fullName.toLowerCase() === pref.toLowerCase() ? 0 : 1;
            const bHit = b.fullName.toLowerCase() === pref.toLowerCase() ? 0 : 1;
            return aHit - bHit;
        });
    }, [filtered, preferredFullName, query]);

    return (
        <div className="rounded-2xl bg-[#161b22] border border-white/10 overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-white/5 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Configure GitHub · Repository selection
                </p>
                <h3 className="text-sm font-bold text-[#e6edf3]">
                    Enable repositories for {productName}
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-slate-400">
                        Enabled Repositories:{' '}
                        <span className="text-[#FFBD59] font-bold tabular-nums">
                            {enabledCount} / {GITHUB_REPO_QUOTA}
                        </span>
                    </p>
                    <button
                        type="button"
                        onClick={handleManagePermissions}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                    >
                        <Shield className="w-3.5 h-3.5 text-[#F0B230]" />
                        Manage GitHub permissions
                        <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                </div>
            </div>

            <div className="px-5 py-3 border-b border-white/5">
                <label className="sr-only" htmlFor="repo-search">
                    Search repositories
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                        id="repo-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search repositories…"
                        className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#e6edf3] placeholder:text-slate-600 focus:border-[#F0B230]/50 focus:outline-none"
                    />
                </div>
            </div>

            <div className="px-5 py-2 border-b border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
                <span>Repository Name</span>
                <span>Access</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {ordered.length === 0 ? (
                    <p className="px-5 py-6 text-slate-500 text-center font-sans">
                        No repositories match “{query.trim()}”.
                    </p>
                ) : (
                    ordered.map((repo) => {
                        const on = enabledIds.includes(repo.id);
                        return (
                            <div
                                key={repo.id}
                                onClick={() => toggleRepo(repo)}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-[#1c2333]/60 transition-colors cursor-pointer"
                            >
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <a
                                            href={catalogUrl(repo.fullName)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-slate-100 font-bold truncate hover:text-[#FFBD59] hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {repo.fullName}
                                        </a>
                                        {repo.private && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 shrink-0">
                                                <Lock className="w-2.5 h-2.5" />
                                                Private
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate font-sans">{repo.description}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRepo(repo);
                                    }}
                                    aria-pressed={on}
                                    aria-label={on ? `Disable ${repo.fullName}` : `Enable ${repo.fullName}`}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${on
                                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                                        : 'bg-[#0d1117] border-white/10 text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {on ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {on ? 'Enabled' : 'Enable'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
