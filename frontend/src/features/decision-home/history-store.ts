/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { AGENT_IDS, type Vote } from '../../domain/decision';
import type { AgentHistoryResult, DecisionHistoryEntry } from './simulator-types';

export const HISTORY_STORAGE_KEY = 'magi-nerv:decision-history:v1';
export const HISTORY_STORAGE_VERSION = 1;
export const HISTORY_LIMIT = 30;

export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): HistoryStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isVote(value: unknown): value is Vote {
  return value === 'approve' || value === 'reject' || value === 'abstain' || value === 'pending';
}

function isAgentResult(value: unknown): value is AgentHistoryResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AgentHistoryResult>;
  return typeof candidate.agentId === 'string'
    && typeof candidate.role === 'string'
    && typeof candidate.response === 'string'
    && typeof candidate.connection === 'string'
    && typeof candidate.baseUrl === 'string'
    && typeof candidate.model === 'string'
    && isVote(candidate.vote);
}

function isHistoryEntry(value: unknown): value is DecisionHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DecisionHistoryEntry>;
  const agents = candidate.agents as Record<string, unknown> | undefined;
  const votes = candidate.votes as Record<string, unknown> | undefined;
  return typeof candidate.id === 'string'
    && typeof candidate.subject === 'string'
    && typeof candidate.completedAt === 'string'
    && typeof agents === 'object'
    && agents !== null
    && typeof votes === 'object'
    && votes !== null
    && AGENT_IDS.every((agentId) => isAgentResult(agents[agentId]) && isVote(votes[agentId]));
}

export function loadDecisionHistory(storage: HistoryStorage | null = browserStorage()): DecisionHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; entries?: unknown[] };
    if (parsed.version !== HISTORY_STORAGE_VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(isHistoryEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveDecisionHistory(
  entries: DecisionHistoryEntry[],
  storage: HistoryStorage | null = browserStorage()
) {
  const limited = entries.slice(0, HISTORY_LIMIT);
  if (!storage) return false;
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
      version: HISTORY_STORAGE_VERSION,
      entries: limited
    }));
    return true;
  } catch {
    return false;
  }
}

export function prependDecisionHistory(
  entries: DecisionHistoryEntry[],
  entry: DecisionHistoryEntry
) {
  return [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
}
