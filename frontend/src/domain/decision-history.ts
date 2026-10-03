/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { AgentId, DecisionRequest, Verdict, Vote } from './decision';
import type { AgentPublicMetadata } from './agent-config';
type Scenario = 'standard' | 'reject' | 'review';

export interface AgentHistoryResult extends AgentPublicMetadata {
  agentId: AgentId;
  displayName?: string;
  role: string;
  vote: Vote;
  response: string;
}

export interface DecisionHistoryEntry {
  status?: 'draft' | 'running' | 'completed' | 'failed';
  id: string;
  subject: string;
  scenario: Scenario;
  priority: DecisionRequest['priority'];
  createdAt: string;
  completedAt: string;
  verdict: Verdict;
  votes: Record<AgentId, Vote>;
  agents: Record<AgentId, AgentHistoryResult>;
}
