/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import type { Decision } from '../../domain/decision';
import { AGENT_IDS } from '../../domain/decision';
import { defaultAgents } from '../decision-console/console-config';
import { cloneAgentConfigs } from './simulator-config';
import { createDecisionHistoryEntry } from './simulator-responses';

const completedDecision: Decision = {
  id: 'decision-001',
  subject: '第07区防衛プロトコルを更新するか',
  priority: 'critical',
  status: 'completed',
  verdict: 'review',
  votes: {
    'MELCHIOR-1': 'approve',
    'BALTHASAR-2': 'abstain',
    'CASPER-3': 'reject'
  },
  createdAt: '2026-08-14T09:00:00.000Z',
  completedAt: '2026-08-14T09:00:02.000Z'
};

describe('decision history', () => {
  it('does not invent missing provider responses or metadata', () => {
    const entry = createDecisionHistoryEntry(completedDecision, 'review', defaultAgents, cloneAgentConfigs());
    for (const id of AGENT_IDS) {
      expect(entry.agents[id].connection).toBe('unknown');
      expect(entry.agents[id].response).toContain('未提供独立论证');
    }
  });
  it('preserves long results and their execution metadata while removing echoed credentials', () => {
    const configs = cloneAgentConfigs();
    configs['MELCHIOR-1'].apiKey = 'sk-never-history';
    const response = 'long reason '.repeat(500) + 'sk-never-history';
    const entry = createDecisionHistoryEntry({ ...completedDecision, outputs: {
      'MELCHIOR-1': { agentId: 'MELCHIOR-1', role: 'role at execution', vote: 'approve', response,
        connection: 'openai-compatible', baseUrl: 'https://example.com/v1', model: 'execution-model', latencyMs: 10 }
    } }, 'review', defaultAgents, configs);
    expect(entry.agents['MELCHIOR-1'].response.length).toBeGreaterThan(5000);
    expect(entry.agents['MELCHIOR-1'].model).toBe('execution-model');
    expect(JSON.stringify(entry)).not.toContain('sk-never-history');
    expect(JSON.stringify(entry)).not.toContain('apiKey');
  });
});
