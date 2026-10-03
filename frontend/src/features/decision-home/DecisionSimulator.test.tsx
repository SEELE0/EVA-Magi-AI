// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { Decision, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import i18n from '../../i18n';
import { defaultAgents } from '../decision-console/console-config';
import { DecisionSimulator } from './DecisionSimulator';
import { markHoneycombRevealAsPlayed } from './honeycomb-reveal';
import { cloneAgentConfigs } from './simulator-config';
import { AgentNode } from '../decision-console/ConsolePrimitives';

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

function simulatorElement(revealReady?: boolean, service = serviceStub()) {
  return (
    <I18nextProvider i18n={i18n}>
      <DecisionSimulator
        service={service}
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
  it.each(['approved', 'rejected', 'review'] as const)('colors connectors from the final %s verdict and resets them for a new motion', async (verdict) => {
    const completed: Decision = {
      ...draft,
      status: 'completed',
      verdict,
      votes: {
        'MELCHIOR-1': verdict === 'rejected' ? 'reject' : 'approve',
        'BALTHASAR-2': verdict === 'approved' ? 'approve' : 'reject',
        'CASPER-3': 'abstain'
      }
    };
    const service = serviceStub();
    // Even if polling already supplies a verdict, connectors wait for the final phase.
    vi.mocked(service.getDecision).mockResolvedValue({ ...completed, status: 'running' });
    let finishExecution!: (decision: Decision) => void;
    vi.mocked(service.executeDecision).mockImplementation(() => new Promise((resolve) => { finishExecution = resolve; }));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => root.render(simulatorElement(false, service)));
      const svg = container.querySelector('.network-links');
      expect(svg?.getAttribute('data-verdict')).toBe('pending');
      await act(async () => { container.querySelector<HTMLButtonElement>('.magi-home__execute')?.click(); });
      expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('deliberation');
      expect(svg?.getAttribute('data-verdict')).toBe('pending');
      await act(async () => { finishExecution(completed); });
      expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('final');
      expect(svg?.getAttribute('data-verdict')).toBe(verdict);
      expect(container.querySelector('.network-connectors')?.getAttribute('d')).not.toContain('Z');
      act(() => container.querySelector<HTMLButtonElement>('.magi-home__new-motion')?.click());
      expect(svg?.getAttribute('data-verdict')).toBe('pending');
    } finally {
      act(() => root.unmount());
    }
  });

  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'])('keeps settled node and layer votes Japanese in %s without remounting on language changes', async (locale) => {
    await i18n.changeLanguage(locale);
    const completed: Decision = {
      ...draft,
      status: 'completed',
      verdict: 'review',
      votes: { 'MELCHIOR-1': 'approve', 'BALTHASAR-2': 'abstain', 'CASPER-3': 'reject' }
    };
    const service = serviceStub();
    vi.mocked(service.executeDecision).mockResolvedValue(completed);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => root.render(simulatorElement(false, service)));
      const initialSvg = container.querySelector('.network-links');
      const initialLabels = Array.from(container.querySelectorAll('.agent-node .vote-state'));
      expect(initialLabels.map((node) => node.textContent)).toEqual(['待機', '待機', '待機']);
      await act(async () => {
        container.querySelector<HTMLButtonElement>('.magi-home__execute')?.click();
      });

      expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('final');
      expect(initialLabels.map((node) => node.textContent)).toEqual(['承認', '棄権', '否決']);
      expect(Array.from(container.querySelectorAll('.magi-home__layer-stack b'), (node) => node.textContent)).toEqual(['承認', '棄権', '否決']);

      await act(async () => { await i18n.changeLanguage(locale === 'en-US' ? 'ja-JP' : 'en-US'); });
      const nextLabels = Array.from(container.querySelectorAll('.agent-node .vote-state'));
      nextLabels.forEach((node, index) => expect(node).toBe(initialLabels[index]));
      expect(container.querySelector('.network-links')).toBe(initialSvg);
      expect(nextLabels.map((node) => node.textContent)).toEqual(['承認', '棄権', '否決']);
      expect(container.querySelector<HTMLTextAreaElement>('#magi-home-subject')?.value).toBe(draft.subject);

      act(() => container.querySelector<HTMLButtonElement>('.magi-home__new-motion')?.click());
      expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('standby');
      expect(initialLabels.map((node) => node.textContent)).toEqual(['待機', '待機', '待機']);
      await act(async () => { container.querySelector<HTMLButtonElement>('.magi-home__execute')?.click(); });
      expect(container.querySelector('.magi-home__simulator')?.getAttribute('data-phase')).toBe('error');
    } finally {
      act(() => root.unmount());
    }
  });

  it('preserves the shared console node default labels and telemetry', () => {
    const markup = renderToStaticMarkup(<AgentNode agent={defaultAgents[0]} vote="approve" position="right" />);
    expect(markup).toContain(i18n.t('status.approve'));
    expect(markup).toContain(i18n.t(`status.${defaultAgents[0].health}`));
    expect(markup).toContain(`${defaultAgents[0].latencyMs}ms`);
  });

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
