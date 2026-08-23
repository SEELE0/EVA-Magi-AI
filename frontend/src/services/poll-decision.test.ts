/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Decision } from '../domain/decision';
import type { DecisionService } from './decision-service';
import { pollDecisionUntilTerminal } from './poll-decision';

const running: Decision = {
  id: 'dec-001',
  subject: 'test',
  priority: 'normal',
  status: 'running',
  verdict: 'pending',
  votes: { 'MELCHIOR-1': 'pending', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' },
  createdAt: '2026-08-23T00:00:00.000Z'
};

const completed: Decision = {
  ...running,
  status: 'completed',
  verdict: 'approved',
  votes: { 'MELCHIOR-1': 'approve', 'BALTHASAR-2': 'approve', 'CASPER-3': 'reject' },
  completedAt: '2026-08-23T00:00:01.000Z'
};

afterEach(() => vi.useRealTimers());

describe('pollDecisionUntilTerminal', () => {
  it('waits for each request before scheduling the next one', async () => {
    vi.useFakeTimers();
    const getDecision = vi.fn()
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(completed);
    const service = { getDecision } as unknown as DecisionService;
    const controller = new AbortController();
    const updates: Decision[] = [];

    const polling = pollDecisionUntilTerminal(service, 'dec-001', {
      signal: controller.signal,
      intervalMs: 10,
      onDecision: (decision) => updates.push(decision)
    });

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);
    await expect(polling).resolves.toEqual(completed);
    expect(getDecision).toHaveBeenCalledTimes(2);
    expect(updates).toEqual([running, completed]);
  });

  it('stops before making a request when cancelled', async () => {
    vi.useFakeTimers();
    const getDecision = vi.fn();
    const service = { getDecision } as unknown as DecisionService;
    const controller = new AbortController();
    const polling = pollDecisionUntilTerminal(service, 'dec-001', {
      signal: controller.signal,
      intervalMs: 10
    });

    controller.abort();
    await expect(polling).rejects.toMatchObject({ name: 'AbortError' });
    expect(getDecision).not.toHaveBeenCalled();
  });
});
