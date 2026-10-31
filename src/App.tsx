import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
import { ToastProvider } from './components/Toast';
import { NavigationProvider, useNavigation } from './lib/navigation';
import { DensityProvider } from './lib/density';
import { ThemeProvider } from './lib/theme';
import { FontScaleProvider } from './lib/fontScale';
import { CommandPalette } from './components/CommandPalette';
import { WorkshopSidebar } from './components/WorkshopSidebar';
import { WorkshopProjectModal } from './components/WorkshopProjectModal';
import { LoadingState } from './components/LoadingState';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { PortfolioScreen } from './screens/Portfolio';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { RunsScreen } from './screens/Runs';
import { MonitoringScreen } from './screens/Monitoring';
import { CostCenterScreen } from './screens/CostCenter';
import { SettingsScreen } from './screens/Settings';
import { ProjectDetailScreen } from './screens/ProjectDetail';
import { isDemoMode, supabase } from './lib/supabase';
import { AlertTriangle, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();
  const { screen, navigate } = useNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = React.useState(false);
  const [supabaseError, setSupabaseError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isDemoMode && supabase) {
      supabase
        .from('projects')
        .select('id')
        .limit(1)
        .then(({ error }: any) => {
          if (error) {
            setSupabaseError(`Supabase connection failed: ${error.message || 'Check database schema and credentials'}`);
          }
        })
        .catch((err: any) => {
          setSupabaseError(`Supabase network failure: ${err.message || 'Failed to connect to Supabase'}`);
        });
    }
  }, []);

  // While auth.loading is true, show minimal checking session splash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <LoadingState type="fullscreen" message="Checking session…" />
      </div>
    );
  }

  // Not authenticated -> show LoginScreen
  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f3f4f6] flex font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:font-bold focus:text-xs"
      >
        Skip to main content
      </a>

      {/* Locked Narrow Left Sidebar */}
      <WorkshopSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
      />

      {/* Main Content Area — Takes the Rest of the Screen */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'pl-14' : 'pl-[13.5rem]'
        }`}
      >
        {/* Runtime Supabase Connection Error Banner */}
        {supabaseError && (
          <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-300 flex items-center justify-between font-mono animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{supabaseError}</span>
            </div>
            <button
              onClick={() => setSupabaseError(null)}
              className="text-rose-400 hover:text-rose-200 p-1 rounded hover:bg-white/5 transition-colors shrink-0"
              title="Dismiss error banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content View */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {(screen.kind === 'portfolio' || screen.kind === 'inbox') && <PortfolioScreen />}
          {screen.kind === 'projects' && <ProjectsScreen />}
          {(screen.kind === 'runs' || screen.kind === 'console') && (
            <RunsScreen initialRunId={(screen as { runId?: string }).runId} />
          )}
          {screen.kind === 'monitoring' && <MonitoringScreen />}
          {screen.kind === 'costs' && <CostCenterScreen />}
          {screen.kind === 'settings' && <SettingsScreen />}
          {screen.kind === 'project' && (
            <ProjectDetailScreen
              projectId={screen.projectId}
              initialTab={screen.tab}
              initialTaskId={(screen as { taskId?: string }).taskId}
            />
          )}
          {screen.kind === 'discovery' && (
            <ProjectDetailScreen
              projectId={(screen as { projectId?: string }).projectId || ''}
              initialTab="spec"
            />
          )}
          {screen.kind === 'qa' && (
            <ProjectDetailScreen
              projectId={(screen as { projectId?: string }).projectId || ''}
              initialTab="verify"
            />
          )}
        </main>

        {/* Global Command Palette */}
        <CommandPalette />
      </div>

      {/* App Shell Modal for New Project */}
      <WorkshopProjectModal
        isOpen={isNewProjectModalOpen}
        initialMode="create"
        onClose={() => setIsNewProjectModalOpen(false)}
        onSuccess={(projectId) => {
          setIsNewProjectModalOpen(false);
          navigate({ kind: 'project', projectId, tab: 'work' });
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FontScaleProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <NavigationProvider>
                  <DensityProvider>
                    <AppContent />
                  </DensityProvider>
                </NavigationProvider>
              </ToastProvider>
            </QueryClientProvider>
          </AuthProvider>
        </FontScaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
