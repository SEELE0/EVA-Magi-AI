// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { Decision, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import i18n from '../../i18n';
import { defaultAgents } from '../decision-console/console-config';
import { DecisionSimulator } from './DecisionSimulator';
import { markHoneycombRevealAsPlayed } from './honeycomb-reveal';
import { cloneAgentConfigs } from './simulator-config';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draft: Decision = {
  id: 'dec-interrupted',
  subject: '第07区防衛プロトコルの更新を承認',
  priority: 'critical',
  status: 'draft',
  verdict: 'pending',
  votes: { 'MELCHIOR-1': 'pending', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' },
  createdAt: '2026-08-29T00:00:00.000Z'
};

const status: SystemStatus = {
  systemName: 'MAGI',
  connection: 'online',
  source: 'mock',
  protocol: 'MAGI/3.0',
  uptimeSeconds: 1,
  updatedAt: '2026-08-29T00:00:00.000Z'
};

function serviceStub(): DecisionService {
  return {
    getSystemStatus: vi.fn().mockResolvedValue(status),
    getAgents: vi.fn().mockResolvedValue(defaultAgents),
    createDecision: vi.fn().mockResolvedValue(draft),
    getDecision: vi.fn().mockResolvedValue(draft),
    executeDecision: vi.fn().mockRejectedValue(new Error('REMOTE LINK LOST')),
    getEvents: vi.fn().mockResolvedValue([])
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en-US');
});

afterEach(async () => {
  document.body.innerHTML = '';
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('zh-CN');
});

function simulatorElement(revealReady?: boolean) {
  return (
    <I18nextProvider i18n={i18n}>
      <DecisionSimulator
        service={serviceStub()}
        agents={defaultAgents}
        configs={cloneAgentConfigs()}
        revealReady={revealReady}
        onOpenConfig={vi.fn()}
        onHistoryCreated={vi.fn()}
        onStatusChange={vi.fn()}
      />
    </I18nextProvider>
  );
}

function stubRevealSurfaces() {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 400 } as DOMRect);
}

describe('DecisionSimulator', () => {
  it('removes the advanced priority and scenario controls', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(simulatorElement(false));
    });

    expect(container.querySelector('.magi-home__advanced-options')).toBeNull();
    expect(container.querySelector('#magi-home-priority')).toBeNull();
    expect(container.querySelector('#magi-home-scenario')).toBeNull();

    act(() => root.unmount());
  });

  it('keeps an interrupted non-terminal decision in the error phase', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(simulatorElement());
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('.magi-home__execute')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('error');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('DIRECT LINK INTERRUPTED');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('REMOTE LINK LOST');
    expect(container.querySelector('.magi-home__motion-banner')).toBeNull();
    expect(container.querySelector('.magi-home__new-motion')).toBeNull();

    act(() => root.unmount());
  });

  it('plays the honeycomb entry reveal on the first visit of a session', () => {
    window.sessionStorage.clear();
    stubRevealSurfaces();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(simulatorElement());
    });

    expect(container.querySelector('.magi-honeycomb')).not.toBeNull();
    expect(container.querySelector<HTMLButtonElement>('.magi-home__node-hotspot button')?.disabled).toBe(true);

    act(() => root.unmount());
  });

  it('skips the honeycomb entry reveal once it has played this session', () => {
    markHoneycombRevealAsPlayed();
    stubRevealSurfaces();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(simulatorElement());
    });

    expect(container.querySelector('.magi-honeycomb')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('.magi-home__node-hotspot button')?.disabled).toBe(false);

    act(() => root.unmount());
  });

  it('waits for the boot handoff before playing the entry reveal', () => {
    window.sessionStorage.clear();
    stubRevealSurfaces();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(simulatorElement(false));
    });
    expect(container.querySelector('.magi-honeycomb')).toBeNull();

    act(() => {
      root.render(simulatorElement(true));
    });

    expect(container.querySelector('.magi-honeycomb')).not.toBeNull();

    act(() => root.unmount());
  });
});
