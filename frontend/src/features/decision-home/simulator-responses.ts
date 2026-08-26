/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { AGENT_IDS, type Agent, type AgentId, type Decision, type Vote } from '../../domain/decision';
import type { Scenario } from '../decision-console/console-config';
import { toPublicAgentMetadata } from './simulator-config';
import type { AgentConfigMap, AgentRuntimeConfig, DecisionHistoryEntry } from './simulator-types';

function voteConclusion(vote: Vote) {
  return {
    approve: '承認',
    reject: '否決',
    abstain: '棄権',
    pending: '保留'
  }[vote];
}

function roleCardSummary(prompt: string) {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .find(Boolean) ?? '既定の人格設定を使用';

  return firstLine.length > 120 ? `${firstLine.slice(0, 119)}…` : firstLine;
}

function responseFor(agentId: AgentId, subject: string, vote: Vote, config: AgentRuntimeConfig) {
  const conclusion = voteConclusion(vote);
  const common = `対象議題「${subject}」について、結論は${conclusion}です。`;
  const roleCard = `【役割カード】${roleCardSummary(config.prompt)}`;

  if (agentId === 'MELCHIOR-1') {
    return [
      `【結論】${common}`,
      roleCard,
      '【理由】実行条件、検証可能性、失敗時の復旧経路を分離して評価しました。現在の判断は、観測できる条件と再現可能な手順を優先した模擬評価です。',
      '【主要リスク】前提データの欠落、不可逆な変更、評価指標の曖昧さが残る場合、判断の信頼度が低下します。',
      '【提案】小規模な検証区間を設定し、成功条件と停止条件を先に固定してください。結果を記録してから次の段階へ進むことを推奨します。'
    ].join('\n\n');
  }

  if (agentId === 'BALTHASAR-2') {
    return [
      `【結論】${common}`,
      roleCard,
      '【理由】影響を受ける人の安全、心理的負荷、長期的に回復できる余地を中心に評価しました。効率だけでなく、弱い立場に置かれる人への保護が必要です。',
      '【主要リスク】説明不足のまま進行すると、不安と孤立が増幅し、後から修復できない損失を生む可能性があります。',
      '【提案】当事者への説明と相談経路を確保し、撤回可能な段階を設けてください。保護措置を確認してから実行することを推奨します。'
    ].join('\n\n');
  }

  return [
    `【結論】${common}`,
    roleCard,
    '【理由】個人の自律、多様な経験、意思決定に参加できる公平性を検討しました。見落とされた当事者の声が反映されることを重視します。',
    '【主要リスク】単一の価値観で結論を固定すると、少数者の経験や選択権が排除され、合意の正当性が損なわれます。',
    '【提案】異なる立場から再確認できる窓口を設け、反対意見を記録してください。関係者が選び直せる余地を残すことを推奨します。'
  ].join('\n\n');
}

export function createDecisionHistoryEntry(
  decision: Decision,
  scenario: Scenario,
  agents: Agent[],
  configs: AgentConfigMap
): DecisionHistoryEntry {
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));
  const results = Object.fromEntries(AGENT_IDS.map((agentId) => {
    const config = configs[agentId];
    const metadata = toPublicAgentMetadata(config);
    const agent = agentMap.get(agentId);
    const vote = decision.votes[agentId];
    return [agentId, {
      agentId,
      role: agent?.role ?? config.role,
      vote,
      response: responseFor(agentId, decision.subject, vote, config),
      ...metadata
    }];
  })) as DecisionHistoryEntry['agents'];

  return {
    id: decision.id,
    subject: decision.subject,
    scenario,
    priority: decision.priority,
    createdAt: decision.createdAt,
    completedAt: decision.completedAt ?? new Date().toISOString(),
    verdict: decision.verdict,
    votes: { ...decision.votes },
    agents: results
  };
}
