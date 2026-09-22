/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
export const AGENT_IDS = ['MELCHIOR-1', 'BALTHASAR-2', 'CASPER-3'] as const;

export type AgentId = (typeof AGENT_IDS)[number];
export type Vote = 'approve' | 'reject' | 'abstain' | 'pending';
export type AgentHealth = 'nominal' | 'degraded' | 'offline';
export type DecisionStatus = 'draft' | 'running' | 'completed' | 'failed';
export type Verdict = 'approved' | 'rejected' | 'review' | 'pending';
export type EventKind = 'created' | 'scan' | 'vote' | 'verdict' | 'failure';
export type ConnectionMode = 'mock' | 'remote';

export interface Agent {
  id: AgentId;
  role: string;
  health: AgentHealth;
  latencyMs: number;
  vote: Vote;
}

export interface SystemStatus {
  systemName: string;
  connection: 'online' | 'degraded' | 'offline';
  source: ConnectionMode;
  protocol: string;
  uptimeSeconds: number;
  updatedAt: string;
  notice?: string;
}

export interface DecisionRequest {
  subject: string;
  priority: 'low' | 'normal' | 'critical';
  simulationHint?: 'standard' | 'reject' | 'review';
}

export interface AgentResult {
  agentId: AgentId;
  role: string;
  vote: Exclude<Vote, 'pending'>;
  response: string;
  connection: 'mock' | 'openai-compatible' | 'local-compatible';
  baseUrl: string;
  model: string;
  latencyMs: number;
}

export interface Decision {
  id: string;
  subject: string;
  priority: DecisionRequest['priority'];
  status: DecisionStatus;
  verdict: Verdict;
  votes: Record<AgentId, Vote>;
  createdAt: string;
  completedAt?: string;
  /** 外部 API 接続ノードが返した本文。模擬ノードには存在しない。 */
  responses?: Partial<Record<AgentId, string>>;
  outputs?: Partial<Record<AgentId, AgentResult>>;
  failures?: Partial<Record<AgentId, string>>;
}

export interface DecisionEvent {
  id: string;
  decisionId: string;
  kind: EventKind;
  timestamp: string;
  message: string;
  agentId?: AgentId;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}
