/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type Agent, type Decision } from '../domain/decision';
import { redactSecrets } from '../domain/redact-secrets';
type Scenario = 'standard' | 'reject' | 'review';
import type { AgentConfigMap } from '../domain/agent-config';
import type { DecisionHistoryEntry } from '../domain/decision-history';

export function createDecisionHistoryEntry(decision: Decision, scenario: Scenario, agents: Agent[], configs: AgentConfigMap): DecisionHistoryEntry {
  return redactSecrets({
    id: decision.id, subject: decision.subject, scenario, priority: decision.priority,
    createdAt: decision.createdAt, completedAt: decision.completedAt ?? new Date().toISOString(),
    verdict: decision.verdict, status: decision.status, votes: { ...decision.votes },
    agents: Object.fromEntries(AGENT_IDS.map(agentId => [agentId, decision.outputs?.[agentId] ?? {
      agentId, role: agents.find(agent => agent.id === agentId)?.role ?? configs[agentId].role,
      vote: decision.votes[agentId], connection: 'unknown', baseUrl: '', model: '',
      response: decision.failures?.[agentId] ?? decision.responses?.[agentId] ?? '本次服务仅返回投票结果，未提供独立论证或模型信息。'
    }])) as DecisionHistoryEntry['agents']
  }, AGENT_IDS.map(id => configs[id].apiKey));
}
