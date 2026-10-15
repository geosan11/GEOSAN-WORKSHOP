import type { ComponentType } from 'react';
import {
    Inbox,
    FolderGit2,
    Terminal,
    Brain,
    DollarSign,
    Activity,
    Settings,
    Home,
    Hammer,
    Play,
    Eye,
    Library,
} from 'lucide-react';
import type { Screen } from './navigation';

export type NavSectionId = 'home' | 'build' | 'operate' | 'observe' | 'library';

export interface NavLeaf {
    id: string;
    label: string;
    /** Legacy / alias names operators may still search for */
    synonyms: string[];
    icon: ComponentType<{ className?: string }>;
    screen: Screen;
    /** Which Screen.kind values light this leaf as active */
    activeKinds: Screen['kind'][];
}

export interface NavSection {
    id: NavSectionId;
    label: string;
    icon: ComponentType<{ className?: string }>;
    /** Mobile bottom-bar destination when the section itself is tapped */
    defaultScreen: Screen;
    items: NavLeaf[];
}

/**
 * Top-level operator IA (≤5 sections). Subsections live inside each section.
 * Screen kinds stay stable; only labels and grouping change in S1.
 */
export const NAV_SECTIONS: NavSection[] = [
    {
        id: 'home',
        label: 'Home',
        icon: Home,
        defaultScreen: { kind: 'inbox' },
        items: [
            {
                id: 'inbox',
                label: 'Inbox',
                synonyms: ['home', 'portfolio', 'triage', 'approvals'],
                icon: Inbox,
                screen: { kind: 'inbox' },
                activeKinds: ['inbox', 'portfolio'],
            },
        ],
    },
    {
        id: 'build',
        label: 'Build',
        icon: Hammer,
        defaultScreen: { kind: 'projects' },
        items: [
            {
                id: 'projects',
                label: 'Projects',
                synonyms: ['build', 'verticals', 'clients'],
                icon: FolderGit2,
                screen: { kind: 'projects' },
                activeKinds: ['projects', 'project', 'discovery', 'qa'],
            },
        ],
    },
    {
        id: 'operate',
        label: 'Operate',
        icon: Play,
        defaultScreen: { kind: 'runs' },
        items: [
            {
                id: 'runs',
                label: 'Runs',
                synonyms: ['operate', 'console', 'sessions', 'agent console'],
                icon: Terminal,
                screen: { kind: 'runs' },
                activeKinds: ['runs', 'console'],
            },
        ],
    },
    {
        id: 'observe',
        label: 'Observe',
        icon: Eye,
        defaultScreen: { kind: 'monitoring' },
        items: [
            {
                id: 'health',
                label: 'Health',
                synonyms: ['probes', 'monitoring', 'observe', 'telemetry'],
                icon: Activity,
                screen: { kind: 'monitoring' },
                activeKinds: ['monitoring'],
            },
            {
                id: 'spend',
                label: 'Spend',
                synonyms: ['money', 'costs', 'budget', 'fleet money', 'ledger'],
                icon: DollarSign,
                screen: { kind: 'costs' },
                activeKinds: ['costs'],
            },
        ],
    },
    {
        id: 'library',
        label: 'Library',
        icon: Library,
        defaultScreen: { kind: 'knowledge' },
        items: [
            {
                id: 'knowledge',
                label: 'Knowledge',
                synonyms: ['vault', 'lessons', 'library', 'post-mortems'],
                icon: Brain,
                screen: { kind: 'knowledge' },
                activeKinds: ['knowledge'],
            },
            {
                id: 'settings',
                label: 'Settings',
                synonyms: ['mcp', 'integrations', 'theme', 'preferences'],
                icon: Settings,
                screen: { kind: 'settings' },
                activeKinds: ['settings'],
            },
        ],
    },
];

export const NAV_LEAVES: NavLeaf[] = NAV_SECTIONS.flatMap((s) => s.items);

export function sectionForScreen(screen: Screen): NavSection | undefined {
    return NAV_SECTIONS.find((section) =>
        section.items.some((item) => item.activeKinds.includes(screen.kind))
    );
}

export function leafForScreen(screen: Screen): NavLeaf | undefined {
    return NAV_LEAVES.find((item) => item.activeKinds.includes(screen.kind));
}

export function isLeafActive(leaf: NavLeaf, screen: Screen): boolean {
    return leaf.activeKinds.includes(screen.kind);
}

export function isSectionActive(section: NavSection, screen: Screen): boolean {
    return section.items.some((item) => isLeafActive(item, screen));
}

/** Human title for TopBar / chrome (renames Money→Spend, Probes→Health). */
export function screenTitle(screen: Screen): string {
    const leaf = leafForScreen(screen);
    if (leaf) return leaf.label;
    if (screen.kind === 'project') return 'Projects';
    return 'Command Center';
}
