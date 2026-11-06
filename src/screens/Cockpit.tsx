import React from "react";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { useCosts } from "../hooks/useCosts";
import { useQA } from "../hooks/useQA";
import { useProjectRealtime } from "../hooks/useProjectRealtime";
import { useNavigation } from "../lib/navigation";
import { useSharedStatus } from "../lib/sharedStatus";
import { isDemoMode } from "../lib/supabase";
import { DEMO_TASKPULSE_LOGS } from "../lib/demoScenario";
import { isProjectBudgetBlocked } from "../lib/projectBudgetGuard";
import type { AgentTask } from "../lib/types";
import {
  parseGitHubRepo,
  topBarModel,
  spendTileModel,
  providersTileModel,
  databaseTileModel,
  githubTileModel,
  agentsModel,
  activityFeedModel,
  type ProxyState,
} from "../lib/cockpitModel";
import {
  shouldProbeProxy,
  probeProxy,
  type CommitSummary,
} from "../lib/cockpitProbe";
import { proxyUrl } from "../lib/proxyAuth";
import { formatRelative } from "../lib/format";
import { cn } from "../lib/utils";
import { LoadingState } from "../components/LoadingState";
import { QueryError } from "../components/QueryError";
import { AgentCard } from "../components/cockpit/AgentCard";
import { ActivityLogPanel } from "../components/cockpit/ActivityLogPanel";
import { TaskDetailDrawer } from "../components/TaskDetailDrawer";
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
  Database,
  DollarSign,
  BrainCircuit,
} from "lucide-react";

export const CockpitScreen: React.FC = () => {
  const { navigate } = useNavigation();
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
    approveTask,
    rejectTask,
    cancelTask,
    retryTask,
  } = useTasks();
  const {
    costEvents,
    loading: cLoading,
    error: cError,
    refetch: cRefetch,
  } = useCosts();
  const { qaRuns, refetch: qRefetch } = useQA();
  const { statusData } = useSharedStatus();

  const [selectedTask, setSelectedTask] = React.useState<AgentTask | null>(
    null,
  );

  // Track initial load for full-screen skeleton
  const initialLoadRef = React.useRef(true);

  React.useEffect(() => {
    if (!pLoading && !tLoading && !cLoading) {
      initialLoadRef.current = false;
    }
    if (pError || tError || cError) {
      initialLoadRef.current = false;
    }
  }, [pLoading, tLoading, cLoading, pError, tError, cError]);

  const firstProject = projects && projects.length > 0 ? projects[0] : null;
  const repo = parseGitHubRepo(
    firstProject?.github_repo_url || firstProject?.repo_url,
  );
  const projectId = firstProject?.id ?? null;

  const { logs: realtimeLogs } = useProjectRealtime({
    projectId: projectId ?? '',
    initialLogs: isDemoMode ? DEMO_TASKPULSE_LOGS : [],
  });

  const [proxyState, setProxyState] = React.useState<ProxyState>("disabled");
  const [latestCommit, setLatestCommit] = React.useState<CommitSummary | null>(
    null,
  );

  // Dev-only proxy probe: runs once on mount in useEffect if shouldProbeProxy is true and repo is known
  React.useEffect(() => {
    let isMounted = true;
    const isDev = Boolean(import.meta.env?.DEV);
    const proxyUrlConfigured = Boolean(import.meta.env?.VITE_PROXY_URL);
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";

    if (!shouldProbeProxy({ isDev, proxyUrlConfigured, hostname }) || !repo) {
      setProxyState("disabled");
      setLatestCommit(null);
      return;
    }

    setProxyState("unknown");
    probeProxy({
      repo,
      projectId,
      url: proxyUrl("/api/github/proxy"),
    }).then((result) => {
      if (!isMounted) return;
      setProxyState(result.state);
      if (result.state === "reachable") {
        setLatestCommit(result.latestCommit);
      } else {
        setLatestCommit(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [repo, projectId]);

  const handleRefreshAll = async () => {
    const isDev = Boolean(import.meta.env?.DEV);
    const proxyUrlConfigured = Boolean(import.meta.env?.VITE_PROXY_URL);
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";

    const canProbe =
      shouldProbeProxy({ isDev, proxyUrlConfigured, hostname }) &&
      Boolean(repo);

    if (canProbe) {
      setProxyState("unknown");
    }

    const probePromise = canProbe
      ? probeProxy({
          repo,
          projectId,
          url: proxyUrl("/api/github/proxy"),
        }).then((result) => {
          setProxyState(result.state);
          if (result.state === "reachable") {
            setLatestCommit(result.latestCommit);
          } else {
            setLatestCommit(null);
          }
        })
      : Promise.resolve();

    await Promise.all([
      pRefetch(),
      tRefetch(),
      cRefetch(),
      qRefetch(),
      probePromise,
    ]);
  };

  // Keep full-screen skeleton only for the very first load
  const isInitialLoading =
    initialLoadRef.current &&
    (pLoading || tLoading || cLoading) &&
    projects.length === 0 &&
    tasks.length === 0 &&
    costEvents.length === 0 &&
    !pError &&
    !tError &&
    !cError;

  if (isInitialLoading) {
    return (
      <div className="min-h-full p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="cards" count={4} />
      </div>
    );
  }

  // Pure view-model computations
  const topBar = topBarModel({
    projects,
    isDemoMode,
    proxyState,
  });

  const capUsd = statusData?.budget?.totalCapUsd;
  const spendTile = spendTileModel({ costEvents, capUsd });
  const providersTile = providersTileModel({ costEvents });
  const databaseTile = databaseTileModel({
    isDemoMode,
    connectionError: pError,
  });
  const githubTile = githubTileModel({ proxyState, latestCommit });
  const agentsData = agentsModel({ tasks, qaRuns });
  const activityData = activityFeedModel({ logs: realtimeLogs, tasks });

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
                className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 max-w-full min-w-0"
                title={topBar.repoLabel}
              >
                <GitBranch className="size-3" />
                <span className="truncate min-w-0 max-w-[200px]">
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
                {cError ? (
                  <QueryError
                    message="Failed to load spend telemetry."
                    onRetry={cRefetch}
                  />
                ) : spendTile.hasData ? (
                  <div className="space-y-2">
                    <p className="text-xl font-semibold text-foreground font-mono">
                      {spendTile.formattedCap
                        ? `${spendTile.formattedTotal} / ${spendTile.formattedCap}`
                        : spendTile.formattedTotal}
                    </p>
                    {spendTile.formattedCap && (
                      <div
                        role="progressbar"
                        aria-label="Weekly spend vs cap"
                        aria-valuenow={spendTile.percent ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                      >
                        <div
                          className={cn(
                            "h-full transition-all",
                            spendTile.level === "ok" && "bg-primary",
                            spendTile.level === "warn" && "bg-(--warning)",
                            spendTile.level === "over" && "bg-destructive",
                          )}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, spendTile.percent ?? 0),
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {spendTile.emptyState}
                    </p>
                    {spendTile.formattedCap && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Cap {spendTile.formattedCap}
                      </p>
                    )}
                  </div>
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
                {cError ? (
                  <QueryError
                    message="Failed to load AI providers."
                    onRetry={cRefetch}
                  />
                ) : providersTile.hasData ? (
                  <div className="flex flex-wrap gap-1.5">
                    {providersTile.chips.map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="font-mono text-[10px] max-w-full min-w-0"
                        title={name}
                      >
                        <span className="truncate">{name}</span>
                      </Badge>
                    ))}
                    {providersTile.moreCount > 0 && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-muted-foreground"
                      >
                        +{providersTile.moreCount} more
                      </Badge>
                    )}
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
                <p
                  className={cn(
                    "text-xs font-mono",
                    databaseTile.status === "Connection error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {databaseTile.status}
                </p>
              </CardContent>
            </Card>

            {/* Tile 4: GitHub */}
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
                {githubTile.hasData && githubTile.latestCommit ? (
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-foreground break-words">
                      <span className="font-semibold text-primary">
                        {githubTile.latestCommit.sha7}
                      </span>
                      {" · "}
                      <span>{githubTile.latestCommit.message}</span>
                      {" · "}
                      <span className="text-muted-foreground">
                        {formatRelative(githubTile.latestCommit.date)}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {githubTile.footnote}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {githubTile.emptyState}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {githubTile.footnote}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* (c) Agents section */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agents
            </h2>
            {agentsData.hasData && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] max-w-full min-w-0"
              >
                <span className="truncate">
                  {agentsData.totalAgents}{" "}
                  {agentsData.totalAgents === 1 ? "agent" : "agents"} ·{" "}
                  {agentsData.totalActiveTasks} active{" "}
                  {agentsData.totalActiveTasks === 1 ? "task" : "tasks"}
                </span>
              </Badge>
            )}
          </div>
          {tError ? (
            <QueryError
              message="Failed to load agent fleet."
              onRetry={tRefetch}
            />
          ) : !agentsData.hasData ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Bot className="size-8 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">
                    {agentsData.emptyState}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => navigate({ kind: "runs" })}
                    className="text-xs font-mono"
                  >
                    Open Agents
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentsData.agents.map((card) => (
                <AgentCard
                  key={card.agent}
                  card={card}
                  onClick={() => {
                    const fullTask =
                      tasks.find((t) => t.id === card.currentTask.id) ?? null;
                    setSelectedTask(fullTask);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* (d) Activity section */}
        <ActivityLogPanel feed={activityData} />
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          try {
            await retryTask(id);
            setSelectedTask(null);
          } catch (err) {
            if (!isProjectBudgetBlocked(err)) throw err;
          }
        }}
      />
    </div>
  );
};
