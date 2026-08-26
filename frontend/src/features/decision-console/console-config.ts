/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { Agent, DecisionRequest, SystemStatus, Verdict, Vote } from '../../domain/decision';

export type Scenario = 'standard' | 'reject' | 'review';

export const defaultAgents: Agent[] = [
  { id: 'MELCHIOR-1', role: '科学者論理', health: 'nominal', latencyMs: 18, vote: 'pending' },
  { id: 'BALTHASAR-2', role: '母性論理', health: 'nominal', latencyMs: 24, vote: 'pending' },
  { id: 'CASPER-3', role: '女性論理', health: 'nominal', latencyMs: 21, vote: 'pending' }
];

export const verdictCopy: Record<Verdict, { label: string; detail: string }> = {
  pending: { label: '入力待機', detail: '議題パケットを待機中' },
  approved: { label: '承認', detail: '多数決により実行を承認' },
  rejected: { label: '否決', detail: '多数決により実行を否決' },
  review: { label: '要再審', detail: '有効な多数決が成立せず' }
};

export const voteCopy: Record<Vote, string> = {
  pending: '待機',
  approve: '承認',
  reject: '否決',
  abstain: '棄権'
};

export const connectionCopy: Record<SystemStatus['connection'], string> = {
  online: '正常',
  degraded: '警戒',
  offline: '遮断'
};

export const sourceCopy: Record<SystemStatus['source'], string> = {
  mock: '模擬系',
  remote: '外部系'
};

export const healthCopy: Record<Agent['health'], string> = {
  nominal: '正常',
  degraded: '警戒',
  offline: '遮断'
};

export const scenarioSubject: Record<Scenario, string> = {
  standard: '第07区防衛プロトコルの更新を承認',
  reject: '【否決】未承認の外部接続申請',
  review: '【保留】観測プロトコルの起動可否'
};

export const defaultPriority: DecisionRequest['priority'] = 'critical';
