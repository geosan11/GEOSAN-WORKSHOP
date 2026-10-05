import React from 'react';

interface PageHeaderProps {
    eyebrow?: React.ReactNode;
    title: string;
    actions?: React.ReactNode;
    className?: string;
}

/**
 * Shared screen chrome: mono eyebrow → display title → optional actions.
 * Matches Portfolio / CostCenter / QARuns header pattern.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    eyebrow,
    title,
    actions,
    className = ''
}) => {
    return (
        <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app ${className}`}
        >
            <div className="min-w-0">
                {eyebrow ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted mb-1 flex-wrap">
                        {eyebrow}
                    </div>
                ) : null}
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-main font-display truncate">
                    {title}
                </h1>
            </div>
            {actions ? (
                <div className="flex items-center gap-3 font-mono text-xs shrink-0 flex-wrap">
                    {actions}
                </div>
            ) : null}
        </div>
    );
};
