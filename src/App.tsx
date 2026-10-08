import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
import { ToastProvider } from './components/Toast';
import { NavigationProvider, useNavigation } from './lib/navigation';
import { DensityProvider } from './lib/density';
import { ThemeProvider } from './lib/theme';
import { TopBar } from './components/TopBar';
import { MobileNavBar } from './components/MobileNavBar';
import { LoadingState } from './components/LoadingState';
import { CommandPalette } from './components/CommandPalette';
import { SupabaseSidebar } from './components/SupabaseSidebar';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { PortfolioScreen } from './screens/Portfolio';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { RunsScreen } from './screens/Runs';
import { KnowledgeVaultScreen } from './screens/KnowledgeVault';
import { CostCenterScreen } from './screens/CostCenter';
import { MonitoringScreen } from './screens/Monitoring';
import { SettingsScreen } from './screens/Settings';
import { ProjectDetailScreen } from './screens/ProjectDetail';

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();
  const { screen } = useNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // While auth.loading is true, show minimal checking session splash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-3">
        <LoadingState type="fullscreen" message="Checking session…" />
      </div>
    );
  }

  // Not authenticated -> show LoginScreen
  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex">
      {/* Fleet Sidebar Navigation (Desktop) */}
      <div className="hidden md:block">
        <SupabaseSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Main Content View */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-[14rem]'
        }`}
      >
        {/* Fixed Header */}
        <TopBar />

        {/* Scrollable Content Area */}
        <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom,20px))] md:pb-8 overflow-y-auto">
          {(screen.kind === 'inbox' || screen.kind === 'portfolio') && <PortfolioScreen />}
          {screen.kind === 'projects' && <ProjectsScreen />}
          {(screen.kind === 'runs' || screen.kind === 'console') && (
            <RunsScreen initialRunId={(screen as { runId?: string }).runId} />
          )}
          {screen.kind === 'knowledge' && <KnowledgeVaultScreen />}
          {screen.kind === 'costs' && <CostCenterScreen />}
          {screen.kind === 'monitoring' && <MonitoringScreen />}
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

        {/* Global Command Palette (Cmd-K / Ctrl-K) */}
        <CommandPalette />

        {/* Mobile Fixed Bottom Tab Bar */}
        <MobileNavBar />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
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
      </ThemeProvider>
    </ErrorBoundary>
  );
}
