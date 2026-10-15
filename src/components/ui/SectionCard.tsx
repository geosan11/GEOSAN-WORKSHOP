import React from 'react';

interface SectionCardProps {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** Remove default padding when the child brings its own (e.g. tables). */
    flush?: boolean;
}

/**
 * Contained panel for related content — progressive disclosure Level 1/2 wrapper.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
    title,
    description,
    actions,
    children,
    className = '',
    flush = false,
}) => {
    const hasHeader = Boolean(title || description || actions);

    return (
        <section className={`section-card overflow-hidden shadow-lg ${className}`}>
            {hasHeader ? (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-app">
                    <div className="min-w-0 space-y-0.5">
                        {title ? <h2 className="text-section-title">{title}</h2> : null}
                        {description ? <p className="text-xs text-muted leading-relaxed">{description}</p> : null}
                    </div>
                    {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
                </div>
            ) : null}
            <div className={flush ? undefined : 'p-4 md:p-5'}>{children}</div>
        </section>
    );
};
