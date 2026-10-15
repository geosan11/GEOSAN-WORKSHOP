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
 * Shared screen chrome: eyebrow stamp → display title → lede → actions.
 * Type hierarchy follows Futur craft: weight contrast + hairline rule.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    eyebrow,
    title,
    lede,
    actions,
    className = '',
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="min-w-0 space-y-2">
                    {eyebrow ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="stamp stamp-primary">{eyebrow}</span>
                        </div>
                    ) : null}
                    <h1 className="text-page-title truncate">{title}</h1>
                    {lede ? <p className="text-lede">{lede}</p> : null}
                </div>
                {actions ? (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:pb-1">
                        {actions}
                    </div>
                ) : null}
            </div>
            <div className="rule-gold" aria-hidden="true" />
        </div>
    );
};
