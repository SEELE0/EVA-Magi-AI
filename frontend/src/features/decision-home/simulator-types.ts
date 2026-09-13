/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { AgentId, DecisionRequest, Verdict, Vote } from '../../domain/decision';
import type { Scenario } from '../decision-console/console-config';

export type AgentConnectionMode = 'mock' | 'openai-compatible' | 'local-compatible';

export interface AgentRuntimeConfig {
  agentId: AgentId;
  role: string;
  connection: AgentConnectionMode;
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt: string;
}

export type AgentConfigMap = Record<AgentId, AgentRuntimeConfig>;

export interface AgentPublicMetadata {
  connection: AgentConnectionMode | 'unknown';
  baseUrl: string;
  model: string;
}

export interface AgentHistoryResult extends AgentPublicMetadata {
  agentId: AgentId;
  role: string;
  vote: Vote;
  response: string;
}

export interface DecisionHistoryEntry {
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

export type SimulatorRoute =
  | { name: 'decision' }
  | { name: 'history' }
  | { name: 'history-detail'; id: string };
