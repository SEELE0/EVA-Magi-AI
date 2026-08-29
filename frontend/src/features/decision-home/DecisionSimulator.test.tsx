// @vitest-environment jsdom
/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Decision, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { defaultAgents } from '../decision-console/console-config';
import { DecisionSimulator } from './DecisionSimulator';
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

afterEach(() => {
  document.body.innerHTML = '';
});

describe('DecisionSimulator', () => {
  it('keeps an interrupted non-terminal decision in the error phase', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <DecisionSimulator
          service={serviceStub()}
          agents={defaultAgents}
          configs={cloneAgentConfigs()}
          onOpenConfig={vi.fn()}
          onHistoryCreated={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );
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
});
