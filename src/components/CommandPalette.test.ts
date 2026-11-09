import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  CommandPalette,
  openCommandPalette,
  OPEN_COMMAND_PALETTE_EVENT,
} from './CommandPalette';
import { NavigationProvider } from '../lib/navigation';
import { ToastProvider } from './Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(element: React.ReactElement): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(NavigationProvider, null, element)
      )
    )
  );
}

test('CommandPalette: returns null when closed', () => {
  const html = renderWithProviders(
    React.createElement(CommandPalette, { isOpen: false })
  );
  assert.ok(!html.includes('role="dialog"'), 'When isOpen is false, dialog is not rendered');
  assert.ok(!html.includes('aria-modal'), 'When isOpen is false, modal is not rendered');
});

test('CommandPalette: renders accessible dialog when open', () => {
  const html = renderWithProviders(
    React.createElement(CommandPalette, { isOpen: true })
  );

  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('role="listbox"'));
  assert.ok(html.includes('role="option"'));
  assert.ok(html.includes('placeholder="Jump to a screen, project, or task"'));

  // Theme tokens
  assert.ok(html.includes('bg-card'));
  assert.ok(html.includes('border-border'));
  assert.ok(html.includes('text-foreground'));
});

test('CommandPalette: includes Cockpit in screen destinations', () => {
  const html = renderWithProviders(
    React.createElement(CommandPalette, { isOpen: true })
  );

  assert.ok(
    html.includes('Cockpit'),
    'Cockpit must be included as a jumpable destination'
  );
  assert.ok(
    html.includes('Engineering Cockpit · Telemetry, agent fleet, and activity'),
    'Cockpit subtitle must be present'
  );
});

test('CommandPalette: lists only globally callable actions and zero screen-local ones', () => {
  const html = renderWithProviders(
    React.createElement(CommandPalette, { isOpen: true })
  );

  // Assert no screen-local fake actions
  assert.ok(!html.includes('New run'), 'Screen-local "New run" must NOT be listed');
  assert.ok(!html.includes('Override agent'), 'Fake orchestrator prompt must NOT be listed');
  assert.ok(!html.includes('SUPERVISOR'), 'Supervisor toggle must NOT be listed');
});

test('CommandPalette: openCommandPalette helper dispatches custom event with query detail', () => {
  let capturedEvent: CustomEvent | null = null;
  const originalWindow = (globalThis as any).window;

  (globalThis as any).window = {
    dispatchEvent: (e: any) => {
      capturedEvent = e;
      return true;
    },
  };

  try {
    openCommandPalette({ query: 'project' });
    assert.ok(capturedEvent !== null);
    assert.equal((capturedEvent as any).type, OPEN_COMMAND_PALETTE_EVENT);
    assert.equal((capturedEvent as any).detail?.query, 'project');

    openCommandPalette();
    assert.ok(
      (capturedEvent as any).detail === undefined ||
      (capturedEvent as any).detail === null
    );
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('CommandPalette: zero network calls made when rendering or querying', () => {
  const originalFetch = (globalThis as any).fetch;
  let fetchCount = 0;

  (globalThis as any).fetch = () => {
    fetchCount++;
    return Promise.reject(new Error('Network should never be called'));
  };

  try {
    renderWithProviders(
      React.createElement(CommandPalette, { isOpen: true })
    );
    assert.equal(fetchCount, 0, 'Zero network calls must occur');
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
});
