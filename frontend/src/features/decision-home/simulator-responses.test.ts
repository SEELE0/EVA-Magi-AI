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

describe('simulated agent history responses', () => {
  it('stores complete user-visible outputs and safe connection metadata for every agent', () => {
    const configs = cloneAgentConfigs();
    configs['MELCHIOR-1'].apiKey = 'sk-never-history';
    configs['MELCHIOR-1'].prompt = '\n  カスタム科学検証カード：停止条件を優先する。  \nこの行は要約に含めない。';
    const entry = createDecisionHistoryEntry(completedDecision, 'review', defaultAgents, configs);

    expect(entry.subject).toBe(completedDecision.subject);
    expect(entry.verdict).toBe('review');
    for (const agentId of AGENT_IDS) {
      expect(entry.agents[agentId].response).toContain('【結論】');
      expect(entry.agents[agentId].response).toContain('【役割カード】');
      expect(entry.agents[agentId].response).toContain('【理由】');
      expect(entry.agents[agentId].response).toContain('【主要リスク】');
      expect(entry.agents[agentId].response).toContain('【提案】');
      expect(entry.agents[agentId].response.length).toBeGreaterThan(150);
      expect(entry.agents[agentId].model).toContain('MAGI-SIM');
    }

    expect(entry.agents['MELCHIOR-1'].response).toContain('【役割カード】カスタム科学検証カード：停止条件を優先する。');
    expect(entry.agents['MELCHIOR-1'].response).not.toContain('この行は要約に含めない。');

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('sk-never-history');
    expect(serialized).not.toContain('apiKey');
  });
});
