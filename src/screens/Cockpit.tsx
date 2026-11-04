import React from "react";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useCosts } from "../hooks/useCosts";
import { isDemoMode } from "../lib/supabase";
import {
  topBarModel,
  spendTileModel,
  providersTileModel,
  databaseTileModel,
  githubTileModel,
  agentsModel,
} from "../lib/cockpitModel";
import { LoadingState } from "../components/LoadingState";
import { QueryError } from "../components/QueryError";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../components/ui/tooltip";
import {
  RefreshCw,
  GitBranch,
  Bot,
  Activity,
  Database,
  DollarSign,
  BrainCircuit,
} from "lucide-react";

export const CockpitScreen: React.FC = () => {
  const {
    projects,
    loading: pLoading,
    error: pError,
    refetch: pRefetch,
  } = useProjects();
  const {
    tasks,
    loading: tLoading,
    error: tError,
    refetch: tRefetch,
  } = useTasks();
  const {
    costEvents,
    loading: cLoading,
    error: cError,
    refetch: cRefetch,
  } = useCosts();

  const handleRefreshAll = async () => {
    await Promise.all([pRefetch(), tRefetch(), cRefetch()]);
  };

  if (pError || tError || cError) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-4xl mx-auto text-center space-y-4 pt-12">
        <QueryError
          message="Failed to load cockpit telemetry."
          onRetry={handleRefreshAll}
        />
      </div>
    );
  }

  if (
    (pLoading || tLoading || cLoading) &&
    projects.length === 0 &&
    tasks.length === 0 &&
    costEvents.length === 0
  ) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="cards" count={4} />
      </div>
    );
  }

  // Pure view-model computations
  // In PR 1, proxy network probe is not implemented: screen passes 'disabled'
  const topBar = topBarModel({
    projects,
    isDemoMode,
    proxyState: "disabled",
  });

  const spendTile = spendTileModel({ costEvents });
  const providersTile = providersTileModel({ costEvents });
  const databaseTile = databaseTileModel({ isDemoMode, connectionError: null });
  const githubTile = githubTileModel({ proxyState: "disabled" });
  const agentsData = agentsModel({ tasks });

  return (
    <div className="min-h-full w-full bg-background text-foreground">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 min-w-0">
        {/* (a) Top Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
              {topBar.title}
            </h1>
            {topBar.repoLabel && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-muted-foreground flex items-center gap-1"
              >
                <GitBranch className="size-3" />
                <span className="truncate max-w-[200px]">
                  {topBar.repoLabel}
                </span>
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge
              variant={topBar.envLabel === "Demo mode" ? "warning" : "outline"}
              className="font-mono text-[10px]"
            >
              {topBar.envLabel}
            </Badge>

            <Badge variant="outline" className="font-mono text-[10px]">
              {topBar.proxyLabel}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    aria-label="Refresh cockpit telemetry"
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh cockpit telemetry</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* (b) Integrations row of 4 tile slots */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Integrations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Spend this week */}
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {spendTile.title}
                  </CardTitle>
                  <DollarSign className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {spendTile.hasData ? (
                  <p className="text-xl font-semibold text-foreground font-mono">
                    {spendTile.formattedTotal}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    {spendTile.emptyState}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tile 2: AI providers */}
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {providersTile.title}
                  </CardTitle>
                  <BrainCircuit className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {providersTile.hasData ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(providersTile.models.length
                      ? providersTile.models
                      : providersTile.providers
                    ).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    {providersTile.emptyState}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tile 3: Database */}
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {databaseTile.title}
                  </CardTitle>
                  <Database className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground font-mono">
                  {databaseTile.emptyState}
                </p>
              </CardContent>
            </Card>

            {/* Tile 4: GitHub CI */}
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {githubTile.title}
                  </CardTitle>
                  <GitBranch className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground font-mono">
                  {githubTile.emptyState}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* (c) Agents section placeholder */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agents
            </h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              Fleet
            </Badge>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <Bot className="size-8 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  {agentsData.hasData
                    ? `${agentsData.totalActiveTasks} active ${agentsData.totalActiveTasks === 1 ? "task" : "tasks"} across ${agentsData.totalAgents} ${agentsData.totalAgents === 1 ? "agent" : "agents"}`
                    : agentsData.emptyState}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Per-agent cards aren't shown here yet. Open Agents for the
                  full list.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* (d) Activity section placeholder */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              Feed
            </Badge>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <Activity className="size-8 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  No activity recorded yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  The activity feed isn't shown here yet. Open Monitoring for
                  current health.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};
