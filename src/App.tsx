import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/dataProvider';
import { ToastProvider } from './components/Toast';
import { NavigationProvider, useNavigation } from './lib/navigation';
import { DensityProvider } from './lib/density';
import { ThemeProvider } from './lib/theme';
import { TopBar } from './components/TopBar';
import { MobileNavBar } from './components/MobileNavBar';
import { LoadingState } from './components/LoadingState';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { PortfolioScreen } from './screens/Portfolio';
import { DiscoveryScreen } from './screens/DiscoveryScreen';
import { KnowledgeVaultScreen } from './screens/KnowledgeVault';
import { ProjectDetailScreen } from './screens/ProjectDetail';
import { AgentConsoleScreen } from './screens/AgentConsole';
import { CostCenterScreen } from './screens/CostCenter';
import { QARunsScreen } from './screens/QARuns';
import { MonitoringScreen } from './screens/Monitoring';
import { SettingsScreen } from './screens/Settings';

import { SupabaseSidebar } from './components/SupabaseSidebar';

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();
  const { screen } = useNavigation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Addendum A1: While auth.loading is true, show minimal checking session splash (do NOT flash login screen)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center gap-3">
        <LoadingState type="fullscreen" message="Checking session…" />
      </div>
    );
  }

  // Not authenticated -> show LoginScreen (Addendum A1)
  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex">
      {/* Supabase Left Sidebar Navigation (Desktop) */}
      <div className="hidden md:block">
        <SupabaseSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Main Right Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        {/* Top Header Navigation */}
        <TopBar />

        {/* Main Content Area */}
        <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom,20px))] md:pb-8">
          {screen.kind === 'portfolio' && <PortfolioScreen />}
          {screen.kind === 'discovery' && <DiscoveryScreen initialProjectId={screen.projectId} />}
          {screen.kind === 'knowledge' && <KnowledgeVaultScreen />}
          {screen.kind === 'project' && (
            <ProjectDetailScreen projectId={screen.projectId} initialTab={screen.tab} />
          )}
          {screen.kind === 'console' && <AgentConsoleScreen />}
          {screen.kind === 'costs' && <CostCenterScreen />}
          {screen.kind === 'qa' && <QARunsScreen />}
          {screen.kind === 'monitoring' && <MonitoringScreen />}
          {screen.kind === 'settings' && <SettingsScreen />}
        </main>

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
          <DataProvider>
            <ToastProvider>
              <NavigationProvider>
                <DensityProvider>
                  <AppContent />
                </DensityProvider>
              </NavigationProvider>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
