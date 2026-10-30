import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { ThemeProvider } from './lib/theme';
import { FontScaleProvider } from './lib/fontScale';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/Toast';
import { NavigationProvider } from './lib/navigation';
import { DensityProvider } from './lib/density';

import { PortfolioScreen } from './screens/Portfolio';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { RunsScreen } from './screens/Runs';
import { KnowledgeVaultScreen } from './screens/KnowledgeVault';
import { CostCenterScreen } from './screens/CostCenter';
import { MonitoringScreen } from './screens/Monitoring';
import { SettingsScreen } from './screens/Settings';
import { ProjectDetailScreen } from './screens/ProjectDetail';
import { LoginScreen } from './screens/LoginScreen';
import { WorkshopSidebar } from './components/WorkshopSidebar';
import { CommandPalette } from './components/CommandPalette';
import { WorkshopProjectModal } from './components/WorkshopProjectModal';
import { type StorageLike } from './lib/placeholderProjectCleanup';

class EmptyBrowserStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

function withEmptyBrowserGlobals<T>(fn: () => T): T {
  const g = globalThis as Record<string, unknown>;
  const prevWindow = g.window;
  const prevLocalStorage = g.localStorage;

  const storage = new EmptyBrowserStorage();
  const windowStub = {
    localStorage: storage,
    location: { hostname: 'localhost', href: 'http://localhost/' },
    history: { pushState: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  g.localStorage = storage;
  g.window = windowStub;
  try {
    return fn();
  } finally {
    if (prevWindow === undefined) {
      delete g.window;
    } else {
      g.window = prevWindow;
    }
    if (prevLocalStorage === undefined) {
      delete g.localStorage;
    } else {
      g.localStorage = prevLocalStorage;
    }
  }
}

function createEmptyQueryClient(prepopulated: boolean): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (prepopulated) {
    client.setQueryData(['projects'], []);
    client.setQueryData(['tasks', undefined], []);
    client.setQueryData(['tasks', 'proj-unknown-000'], []);
    client.setQueryData(['tasks', ''], []);
    client.setQueryData(['qaRuns', undefined], []);
    client.setQueryData(['qaFindings', undefined], []);
    client.setQueryData(['costs', undefined], []);
    client.setQueryData(['conversations', 'proj-unknown-000'], []);
  }
  return client;
}

function renderWithAppProviders(element: React.ReactElement, prepopulated = true): string {
  return withEmptyBrowserGlobals(() => {
    const queryClient = createEmptyQueryClient(prepopulated);
    const tree = React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        FontScaleProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(
              ToastProvider,
              null,
              React.createElement(
                NavigationProvider,
                null,
                React.createElement(DensityProvider, null, element)
              )
            )
          )
        )
      )
    );
    return renderToString(tree);
  });
}

test('empty state: PortfolioScreen (Inbox) renders without throwing with zero projects and empty stores', () => {
  const htmlLoaded = renderWithAppProviders(React.createElement(PortfolioScreen), true);
  assert.ok(htmlLoaded.includes('Inbox'));
  const htmlLoading = renderWithAppProviders(React.createElement(PortfolioScreen), false);
  assert.ok(htmlLoading.length > 0);
});

test('empty state: ProjectsScreen renders without throwing with zero projects and empty stores', () => {
  const htmlLoaded = renderWithAppProviders(React.createElement(ProjectsScreen), true);
  assert.ok(htmlLoaded.includes('No active projects found'));
  const htmlLoading = renderWithAppProviders(React.createElement(ProjectsScreen), false);
  assert.ok(htmlLoading.length > 0);
});

test('empty state: RunsScreen renders without throwing with zero projects and empty stores', () => {
  const htmlLoaded = renderWithAppProviders(React.createElement(RunsScreen), true);
  assert.ok(htmlLoaded.includes('No runs yet'));
  const htmlLoading = renderWithAppProviders(React.createElement(RunsScreen), false);
  assert.ok(htmlLoading.length > 0);
});

test('empty state: KnowledgeVaultScreen renders without throwing with zero projects and empty stores', () => {
  const html = renderWithAppProviders(React.createElement(KnowledgeVaultScreen), true);
  assert.ok(html.includes('Knowledge'));
  assert.ok(html.includes('0 verticals in fleet'));
});

test('empty state: CostCenterScreen renders without throwing with zero projects and empty stores', () => {
  const htmlLoaded = renderWithAppProviders(React.createElement(CostCenterScreen), true);
  assert.ok(htmlLoaded.includes('No Cost Events Recorded'));
  const htmlLoading = renderWithAppProviders(React.createElement(CostCenterScreen), false);
  assert.ok(htmlLoading.length > 0);
});

test('empty state: MonitoringScreen renders without throwing with zero projects and empty stores', () => {
  const html = renderWithAppProviders(React.createElement(MonitoringScreen), true);
  assert.ok(html.includes('Health'));
  assert.ok(html.includes('All 0 verticals are healthy'));
});

test('empty state: SettingsScreen renders without throwing with zero projects and empty stores', () => {
  const html = renderWithAppProviders(React.createElement(SettingsScreen), true);
  assert.ok(html.includes('Settings'));
});

test('empty state: ProjectDetailScreen with an unknown projectId renders without throwing with zero projects', () => {
  const htmlLoaded = renderWithAppProviders(
    React.createElement(ProjectDetailScreen, { projectId: 'proj-unknown-000', initialTab: 'work' }),
    true
  );
  assert.ok(htmlLoaded.includes('Project not found.'));

  const htmlDiscovery = renderWithAppProviders(
    React.createElement(ProjectDetailScreen, { projectId: '', initialTab: 'spec' }),
    true
  );
  assert.ok(htmlDiscovery.includes('Project not found.'));

  const htmlLoading = renderWithAppProviders(
    React.createElement(ProjectDetailScreen, { projectId: 'proj-unknown-000', initialTab: 'work' }),
    false
  );
  assert.ok(htmlLoading.length > 0);
});

test('empty state: LoginScreen, app shell components, and root App render without throwing with zero projects and empty stores', () => {
  const loginHtml = renderWithAppProviders(React.createElement(LoginScreen), true);
  assert.ok(loginHtml.includes('Geosan'));

  const shellHtml = renderWithAppProviders(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(WorkshopSidebar, {
        collapsed: false,
        onToggleCollapse: () => {},
        onOpenNewProject: () => {},
      }),
      React.createElement(CommandPalette),
      React.createElement(WorkshopProjectModal, {
        isOpen: true,
        initialMode: 'create',
        onClose: () => {},
        onSuccess: () => {},
      })
    ),
    true
  );
  assert.ok(shellHtml.includes('GEOSAN'));

  const appHtml = withEmptyBrowserGlobals(() => renderToString(React.createElement(App)));
  assert.ok(appHtml.length > 0);
});
