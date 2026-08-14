/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { describe, expect, it } from 'vitest';
import type { Decision } from '../../domain/decision';
import { defaultAgents } from '../decision-console/console-config';
import {
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  loadDecisionHistory,
  prependDecisionHistory,
  saveDecisionHistory,
  type HistoryStorage
} from './history-store';
import { cloneAgentConfigs } from './simulator-config';
import { createDecisionHistoryEntry } from './simulator-responses';

class MemoryStorage implements HistoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function historyEntry(id: string) {
  const decision: Decision = {
    id,
    subject: `判定議題 ${id}`,
    priority: 'normal',
    status: 'completed',
    verdict: 'approved',
    votes: { 'MELCHIOR-1': 'approve', 'BALTHASAR-2': 'approve', 'CASPER-3': 'reject' },
    createdAt: '2026-08-14T09:00:00.000Z',
    completedAt: '2026-08-14T09:00:02.000Z'
  };
  return createDecisionHistoryEntry(decision, 'standard', defaultAgents, cloneAgentConfigs());
}

describe('decision history storage', () => {
  it('uses a versioned record and caps history at the configured limit', () => {
    const storage = new MemoryStorage();
    const entries = Array.from({ length: HISTORY_LIMIT + 4 }, (_, index) => historyEntry(`decision-${index}`));

    expect(saveDecisionHistory(entries, storage)).toBe(true);
    expect(loadDecisionHistory(storage)).toHaveLength(HISTORY_LIMIT);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toContain('"version":1');
  });

  it('prepends and de-duplicates a completed decision', () => {
    const first = historyEntry('decision-1');
    const replacement = { ...first, subject: '更新された議題' };
    expect(prependDecisionHistory([first], replacement)).toEqual([replacement]);
  });

  it('returns an empty list when storage data is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_STORAGE_KEY, '{broken');
    expect(loadDecisionHistory(storage)).toEqual([]);
  });

  it('rejects entries missing a MAGI personality result', () => {
    const storage = new MemoryStorage();
    const complete = historyEntry('decision-complete');
    const incomplete = {
      ...historyEntry('decision-incomplete'),
      agents: { 'MELCHIOR-1': complete.agents['MELCHIOR-1'] }
    };
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: [incomplete, complete] }));

    expect(loadDecisionHistory(storage)).toEqual([complete]);
  });
});
