import React from 'react';
import { Terminal, Send, Compass, FolderGit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { openCommandPalette } from '../CommandPalette';
import { commandBarModel } from '../../lib/cockpitModel';
import { cn } from '../../lib/utils';

export interface CommandBarProps {
  onOpenPalette?: (query?: string) => void;
  className?: string;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onOpenPalette,
  className,
}) => {
  const model = commandBarModel();

  const handleOpen = (query?: string) => {
    if (onOpenPalette) {
      onOpenPalette(query);
    } else {
      openCommandPalette({ query });
    }
  };

  return (
    <footer
      role="region"
      aria-label="Cockpit command bar"
      className={cn(
        "sticky bottom-0 z-20 w-full border-t border-border bg-card/95 backdrop-blur-xs px-3 sm:px-6 py-2.5 sm:py-3 transition-colors shadow-xs",
        className
      )}
    >
      <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Global Action Buttons */}
        <div
          role="toolbar"
          aria-label="Global quick actions"
          className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpen('screen')}
            aria-label="Jump to screen"
            className="h-8 text-xs font-mono gap-1.5 px-2.5 bg-background hover:bg-accent text-foreground hover:text-accent-foreground"
          >
            <Compass className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Jump to screen</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpen('project')}
            aria-label="Open project"
            className="h-8 text-xs font-mono gap-1.5 px-2.5 bg-background hover:bg-accent text-foreground hover:text-accent-foreground"
          >
            <FolderGit2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Open project</span>
          </Button>
        </div>

        {/* Command Palette Trigger Dock */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpen()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpen();
            }
          }}
          className="relative flex-1 group flex items-center justify-between h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none min-w-0"
          aria-label="Open command palette (Cmd+K)"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <Terminal className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span className="text-xs text-muted-foreground truncate font-mono">
              {model.placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-background text-muted-foreground border border-border shadow-2xs">
              {model.shortcutLabel}
            </kbd>
            <Button
              size="icon"
              variant="default"
              className="h-6 w-6 rounded-md pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Send className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};
