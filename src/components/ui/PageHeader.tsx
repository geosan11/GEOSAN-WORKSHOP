import React from 'react';

interface PageHeaderProps {
    eyebrow?: React.ReactNode;
    title: string;
    /** One-line orientation lede under the title (Google Cloud page pattern). */
    lede?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

/**
 * Shared screen chrome: optional eyebrow → title → lede → actions.
 * Prefer this over bespoke H1 blocks so every page orients the same way.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    eyebrow,
    title,
    lede,
    actions,
    className = '',
}) => {
    return (
        <div
            className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-app ${className}`}
        >
            <div className="min-w-0 space-y-1">
                {eyebrow ? (
                    <div className="flex items-center gap-2 text-meta flex-wrap">{eyebrow}</div>
                ) : null}
                <h1 className="text-page-title truncate">{title}</h1>
                {lede ? <p className="text-xs text-muted max-w-2xl leading-relaxed">{lede}</p> : null}
            </div>
            {actions ? (
                <div className="flex items-center gap-2 font-mono text-xs shrink-0 flex-wrap sm:pt-0.5">
                    {actions}
                </div>
            ) : null}
        </div>
    );
};
