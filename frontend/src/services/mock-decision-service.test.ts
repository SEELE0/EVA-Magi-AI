/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { MockDecisionService } from './mock-decision-service';

describe('MockDecisionService', () => {
  it('approves the standard vote path', async () => {
    const service = new MockDecisionService();
    const decision = await service.createDecision({ subject: 'STANDARD', priority: 'normal' });
    const completed = await service.executeDecision(decision.id);

    expect(completed.status).toBe('completed');
    expect(completed.verdict).toBe('approved');
    expect(completed.votes['MELCHIOR-1']).toBe('approve');
  });

  it('rejects a rejection scenario', async () => {
    const service = new MockDecisionService();
    const decision = await service.createDecision({ subject: '[REJECT] block external access', priority: 'critical' });
    const completed = await service.executeDecision(decision.id);

    expect(completed.verdict).toBe('rejected');
    expect(completed.votes['BALTHASAR-2']).toBe('reject');
  });

  it('requests review when votes do not create a majority', async () => {
    const service = new MockDecisionService();
    const decision = await service.createDecision({ subject: '[REVIEW] observation protocol', priority: 'low' });
    const completed = await service.executeDecision(decision.id);

    expect(completed.verdict).toBe('review');
    expect(await service.getEvents(decision.id)).toHaveLength(6);
  });
});
