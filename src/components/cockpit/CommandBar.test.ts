import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CommandBar } from './CommandBar';
import { OPEN_COMMAND_PALETTE_EVENT, OpenCommandPaletteDetail } from '../CommandPalette';
import { commandBarModel } from '../../lib/cockpitModel';

const FORBIDDEN_WORDS = [
  'K8S',
  'ops/sec',
  'CPU',
  'MEM',
  'latency',
  'Monthly burn',
  'alive',
  'heartbeat',
  'Supervisor',
  'Advisor',
];

// Helper to test keyboard event handlers on React element props directly
function getComponentProps(element: React.ReactElement): any {
  return element.props;
}

test('CommandBar: renders with semantic theme tokens and accessible roles', () => {
  const html = renderToString(React.createElement(CommandBar));

  // Role and accessibility
  assert.ok(html.includes('role="region"'), 'Must have region role');
  assert.ok(html.includes('aria-label="Cockpit command bar"'), 'Must have region label');
  assert.ok(html.includes('role="toolbar"'), 'Must have toolbar role for global actions');
  assert.ok(html.includes('role="button"'), 'Must have button role on palette trigger');
  assert.ok(html.includes('tabindex="0"'), 'Trigger must be keyboard focusable with tabIndex 0');

  // Semantic theme classes (no hardcoded dark hexes)
  assert.ok(html.includes('bg-card'), 'Must use semantic bg-card token');
  assert.ok(html.includes('border-border'), 'Must use semantic border-border token');
  assert.ok(html.includes('text-foreground'), 'Must use semantic text-foreground token');
  assert.ok(html.includes('text-muted-foreground'), 'Must use semantic text-muted-foreground token');

  // Responsive: flex-col on mobile (<640px) and sm:flex-row on desktop
  assert.ok(html.includes('flex flex-col sm:flex-row'), 'Must adapt layout from 360px without overflow');
});

test('CommandBar: keyboard Enter and Space on trigger fire onOpenPalette', () => {
  let openCount = 0;
  let receivedQuery: string | undefined = 'initial';

  const component = React.createElement(CommandBar, {
    onOpenPalette: (q) => {
      openCount++;
      receivedQuery = q;
    },
  });

  // Extract children from the component render
  const rendered = CommandBar(component.props as any) as React.ReactElement<any>;
  const innerDiv = rendered.props.children;
  const triggerDiv = innerDiv.props.children[1]; // The trigger dock is the second child

  assert.equal(triggerDiv.props.role, 'button');
  assert.equal(triggerDiv.props.tabIndex, 0);

  // Test Enter key
  let prevented = false;
  triggerDiv.props.onKeyDown({
    key: 'Enter',
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(openCount, 1);
  assert.equal(receivedQuery, undefined);
  assert.equal(prevented, true);

  // Test Space key (' ')
  prevented = false;
  triggerDiv.props.onKeyDown({
    key: ' ',
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(openCount, 2);
  assert.equal(receivedQuery, undefined);
  assert.equal(prevented, true);

  // Other keys (e.g. Tab, Escape, ArrowDown) must NOT trigger open
  prevented = false;
  triggerDiv.props.onKeyDown({
    key: 'ArrowDown',
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(openCount, 2, 'ArrowDown must not fire onOpenPalette');
  assert.equal(prevented, false);
});

test('CommandBar: quick action buttons trigger onOpenPalette with their respective queries', () => {
  const queries: (string | undefined)[] = [];

  const component = React.createElement(CommandBar, {
    onOpenPalette: (q) => {
      queries.push(q);
    },
  });

  const rendered = CommandBar(component.props as any) as React.ReactElement<any>;
  const innerDiv = rendered.props.children;
  const toolbar = innerDiv.props.children[0];
  const buttons = toolbar.props.children;

  const jumpScreenBtn = buttons[0];
  const openProjectBtn = buttons[1];

  // Click / activate Jump to screen
  jumpScreenBtn.props.onClick();
  assert.equal(queries.length, 1);
  assert.equal(queries[0], 'screen');

  // Click / activate Open project
  openProjectBtn.props.onClick();
  assert.equal(queries.length, 2);
  assert.equal(queries[1], 'project');
});

test('CommandBar: dispatches OPEN_COMMAND_PALETTE_EVENT when no callback is passed', () => {
  let receivedEvent: CustomEvent<OpenCommandPaletteDetail> | null = null;

  const originalWindow = (globalThis as any).window;
  const listeners: Record<string, Function[]> = {};

  (globalThis as any).window = {
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener: (evt: string, fn: Function) => {
      listeners[evt] = (listeners[evt] || []).filter((f) => f !== fn);
    },
    dispatchEvent: (evt: any) => {
      receivedEvent = evt;
      return true;
    },
  };

  try {
    const rendered = CommandBar({}) as React.ReactElement<any>;
    const innerDiv = rendered.props.children;
    const triggerDiv = innerDiv.props.children[1];

    // Trigger click on dock
    triggerDiv.props.onClick();

    assert.ok(receivedEvent !== null, 'Event must be dispatched');
    assert.equal((receivedEvent as any).type, OPEN_COMMAND_PALETTE_EVENT);
    assert.equal((receivedEvent as any).detail?.query, undefined);

    // Trigger click on Jump to screen button
    const toolbar = innerDiv.props.children[0];
    const jumpScreenBtn = toolbar.props.children[0];
    jumpScreenBtn.props.onClick();

    assert.equal((receivedEvent as any).detail?.query, 'screen');
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('CommandBar: does NOT attach any second Cmd+K keydown handler', () => {
  const registeredListeners: { event: string; fn: Function }[] = [];

  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {
    addEventListener: (event: string, fn: Function) => {
      registeredListeners.push({ event, fn });
    },
    removeEventListener: () => {},
  };

  try {
    // Render and mount CommandBar
    renderToString(React.createElement(CommandBar));

    // Verify no window keydown listener was registered by CommandBar
    const keydownListeners = registeredListeners.filter((l) => l.event === 'keydown');
    assert.equal(
      keydownListeners.length,
      0,
      'CommandBar must NOT add a second window keydown listener for Cmd+K'
    );
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('CommandBar: zero network calls made during render or activation', () => {
  const originalFetch = (globalThis as any).fetch;
  let fetchCount = 0;

  (globalThis as any).fetch = () => {
    fetchCount++;
    return Promise.reject(new Error('Network should never be called'));
  };

  try {
    const rendered = CommandBar({
      onOpenPalette: () => {},
    }) as React.ReactElement<any>;

    // Execute keyboard activations
    const innerDiv = rendered.props.children;
    const triggerDiv = innerDiv.props.children[1];
    triggerDiv.props.onKeyDown({ key: 'Enter', preventDefault: () => {} });
    triggerDiv.props.onClick();

    const toolbar = innerDiv.props.children[0];
    toolbar.props.children[0].props.onClick();
    toolbar.props.children[1].props.onClick();

    assert.equal(fetchCount, 0, 'Zero network calls must occur');
  } finally {
    (globalThis as any).fetch = originalFetch;
  }
});

test('CommandBar: anti-slop invariant (zero forbidden copy and NO Supervisor/Advisor toggle)', () => {
  const html = renderToString(React.createElement(CommandBar));

  for (const forbidden of FORBIDDEN_WORDS) {
    const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
    assert.ok(
      !regex.test(html),
      `Forbidden word "${forbidden}" found in CommandBar rendered HTML: ${html}`
    );
  }

  // Explicit check for Supervisor / Advisor toggle
  assert.ok(!html.includes('SUPERVISOR'), 'Must not build SUPERVISOR toggle button');
  assert.ok(!html.includes('ADVISOR'), 'Must not build ADVISOR toggle button');
});
