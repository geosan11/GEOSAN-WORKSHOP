import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/dataProvider';
import { ToastProvider } from './components/Toast';
import { NavigationProvider, useNavigation } from './lib/navigation';
import { DensityProvider } from './lib/density';
import { TopBar } from './components/TopBar';
import { MobileNavBar } from './components/MobileNavBar';
import { LoadingState } from './components/LoadingState';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { PortfolioScreen } from './screens/Portfolio';
import { ProjectDetailScreen } from './screens/ProjectDetail';
import { AgentConsoleScreen } from './screens/AgentConsole';
import { CostCenterScreen } from './screens/CostCenter';
import { QARunsScreen } from './screens/QARuns';
import { SettingsScreen } from './screens/Settings';
import { ControlPlaneLayout } from './components/dashboard/ControlPlaneLayout';
import { FoundryChassis } from './components/foundry/FoundryChassis';

const AppContent: React.FC = () => {
  const { session, loading } = useAuth();
  const { screen } = useNavigation();

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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col">
      {/* Top Header Navigation */}
      <TopBar />

      {/* Main Content Area (pb added so content is not obscured by mobile bottom nav - Addendum A10) */}
      <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom,20px))] md:pb-8">
        {screen.kind === 'control_plane' && <ControlPlaneLayout />}
        {screen.kind === 'foundry' && <FoundryChassis />}
        {screen.kind === 'portfolio' && <PortfolioScreen />}
        {screen.kind === 'project' && (
          <ProjectDetailScreen projectId={screen.projectId} initialTab={screen.tab} />
        )}
        {screen.kind === 'console' && <AgentConsoleScreen />}
        {screen.kind === 'costs' && <CostCenterScreen />}
        {screen.kind === 'qa' && <QARunsScreen />}
        {screen.kind === 'settings' && <SettingsScreen />}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Addendum A10) */}
      <MobileNavBar />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
