/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { AGENT_IDS, type AgentId } from './decision';
import { redactSecrets } from './redact-secrets';

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

/** 模擬接続で BASE URL 欄に表示する哨兵値。実接続へ切り替える際は空欄へ初期化する。 */
export const MOCK_CONNECTION_BASE_URL = '内部模擬回線';

export function mockModelFor(agentId: AgentId): string {
  return `MAGI-SIM / ${agentId.split('-')[0]}`;
}

export const defaultAgentConfigs: AgentConfigMap = {
  'MELCHIOR-1': {
    agentId: 'MELCHIOR-1',
    role: '科学者論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('MELCHIOR-1'),
    apiKey: '',
    prompt: [
      'あなたは科学者として、検証可能な証拠と再現性を最優先に判断します。',
      '議題の前提、因果関係、実行可能性を分けて評価してください。',
      '結論・理由・主要リスク・検証可能な次の行動を明示してください。',
      '断定できない点は不確実性として記録し、隠れた思考過程は出力しません。'
    ].join('\n')
  },
  'BALTHASAR-2': {
    agentId: 'BALTHASAR-2',
    role: '母性論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('BALTHASAR-2'),
    apiKey: '',
    prompt: [
      'あなたは母性論理の視点から、人命、心理的安全、長期的な養育可能性を重視します。',
      '弱い立場に置かれる人への影響と、回復不能な損失を優先して評価してください。',
      '結論・理由・主要リスク・保護的な代替案を明示してください。',
      '共感を判断材料に含めますが、隠れた思考過程は出力しません。'
    ].join('\n')
  },
  'CASPER-3': {
    agentId: 'CASPER-3',
    role: '女性論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('CASPER-3'),
    apiKey: '',
    prompt: [
      'あなたは女性論理の視点から、個人の自律、多様な経験、権力関係を検討します。',
      '見落とされた当事者の声、合意形成、公平性への影響を評価してください。',
      '結論・理由・主要リスク・関係を編み直す提案を明示してください。',
      '単一の正解に回収せず、隠れた思考過程は出力しません。'
    ].join('\n')
  }
};

export function cloneAgentConfigs(configs: AgentConfigMap = defaultAgentConfigs): AgentConfigMap {
  return Object.fromEntries(
    AGENT_IDS.map((agentId) => [agentId, { ...configs[agentId] }])
  ) as AgentConfigMap;
}

export function toPublicAgentMetadata(config: AgentRuntimeConfig): AgentPublicMetadata {
  return {
    connection: config.connection,
    baseUrl: config.baseUrl.trim() || '未設定',
    model: config.model.trim() || '未設定'
  };
}

/** API KEY を除いた設定のみを直列化する。鍵はページメモリ外へ出さない。 */
export function serializeAgentConfigsForStorage(configs: AgentConfigMap): string {
  const safeConfigs = Object.fromEntries(
    AGENT_IDS.map((agentId) => {
      const { apiKey: _apiKey, ...safeConfig } = configs[agentId];
      return [agentId, safeConfig];
    })
  ) as Record<AgentId, Omit<AgentRuntimeConfig, 'apiKey'>>;

  return JSON.stringify({ version: 1, configs: redactSecrets(safeConfigs, AGENT_IDS.map((id) => configs[id].apiKey)) });
}

export function countLiveAgents(configs: AgentConfigMap): number {
  return AGENT_IDS.filter((agentId) => configs[agentId].connection !== 'mock').length;
}
