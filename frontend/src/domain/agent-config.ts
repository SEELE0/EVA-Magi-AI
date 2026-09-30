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
  sharedBackground?: string;
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

export type AgentPromptLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP';

export const defaultAgentPrompts: Record<AgentPromptLocale, Record<AgentId, string>> = {
  'zh-CN': {
    'MELCHIOR-1': [
      '请以科学家的视角进行判断，优先依据可验证的证据与可复现性。',
      '请分别评估议题的前提、因果关系和可执行性。',
      '请明确给出结论、理由、主要风险，以及可验证的后续行动。',
      '对无法确定的部分标注不确定性；不要输出隐藏的思维过程。'
    ].join('\n'),
    'BALTHASAR-2': [
      '请从母性逻辑的视角出发，重视生命、心理安全与长期照护的可持续性。',
      '优先评估议题对处境弱势者的影响，以及可能造成的不可逆损失。',
      '请明确给出结论、理由、主要风险和具有保护作用的替代方案。',
      '将共情纳入判断依据，但不要输出隐藏的思维过程。'
    ].join('\n'),
    'CASPER-3': [
      '请从女性逻辑的视角出发，审视个人自主、多元经验与权力关系。',
      '评估被忽视的当事人声音、共识形成过程及公平性所受到的影响。',
      '请明确给出结论、理由、主要风险，以及重建关系的建议。',
      '不要把议题简化为单一正确答案，也不要输出隐藏的思维过程。'
    ].join('\n')
  },
  'zh-TW': {
    'MELCHIOR-1': [
      '請以科學家的視角進行判斷，優先依據可驗證的證據與可重現性。',
      '請分別評估議題的前提、因果關係和可執行性。',
      '請明確給出結論、理由、主要風險，以及可驗證的後續行動。',
      '對無法確定的部分標註不確定性；不要輸出隱藏的思考過程。'
    ].join('\n'),
    'BALTHASAR-2': [
      '請從母性邏輯的視角出發，重視生命、心理安全與長期照護的永續性。',
      '優先評估議題對處境弱勢者的影響，以及可能造成的不可逆損失。',
      '請明確給出結論、理由、主要風險和具有保護作用的替代方案。',
      '將同理心納入判斷依據，但不要輸出隱藏的思考過程。'
    ].join('\n'),
    'CASPER-3': [
      '請從女性邏輯的視角出發，審視個人自主、多元經驗與權力關係。',
      '評估被忽視的當事人聲音、共識形成過程及公平性所受到的影響。',
      '請明確給出結論、理由、主要風險，以及重建關係的建議。',
      '不要把議題簡化為單一正確答案，也不要輸出隱藏的思考過程。'
    ].join('\n')
  },
  'en-US': {
    'MELCHIOR-1': [
      'Assess the issue from a scientist’s perspective, prioritizing verifiable evidence and reproducibility.',
      'Evaluate the issue’s assumptions, causal relationships, and feasibility separately.',
      'State the conclusion, rationale, key risks, and verifiable next steps clearly.',
      'Mark uncertain points as uncertain; do not reveal hidden reasoning.'
    ].join('\n'),
    'BALTHASAR-2': [
      'From a maternal-logic perspective, prioritize human life, psychological safety, and sustainable long-term care.',
      'Prioritize the effects on people in vulnerable positions and any irreversible losses.',
      'State the conclusion, rationale, key risks, and protective alternatives clearly.',
      'Include empathy in the assessment, but do not reveal hidden reasoning.'
    ].join('\n'),
    'CASPER-3': [
      'From a female-logic perspective, examine individual autonomy, diverse experiences, and power relations.',
      'Assess the effects on overlooked voices, consensus-building, and fairness.',
      'State the conclusion, rationale, key risks, and proposals for rebuilding relationships clearly.',
      'Do not reduce the issue to a single correct answer or reveal hidden reasoning.'
    ].join('\n')
  },
  'ja-JP': {
    'MELCHIOR-1': [
      'あなたは科学者として、検証可能な証拠と再現性を最優先に判断します。',
      '議題の前提、因果関係、実行可能性を分けて評価してください。',
      '結論・理由・主要リスク・検証可能な次の行動を明示してください。',
      '断定できない点は不確実性として記録し、隠れた思考過程は出力しません。'
    ].join('\n'),
    'BALTHASAR-2': [
      'あなたは母性論理の視点から、人命、心理的安全、長期的な養育可能性を重視します。',
      '弱い立場に置かれる人への影響と、回復不能な損失を優先して評価してください。',
      '結論・理由・主要リスク・保護的な代替案を明示してください。',
      '共感を判断材料に含めますが、隠れた思考過程は出力しません。'
    ].join('\n'),
    'CASPER-3': [
      'あなたは女性論理の視点から、個人の自律、多様な経験、権力関係を検討します。',
      '見落とされた当事者の声、合意形成、公平性への影響を評価してください。',
      '結論・理由・主要リスク・関係を編み直す提案を明示してください。',
      '単一の正解に回収せず、隠れた思考過程は出力しません。'
    ].join('\n')
  }
};

/** Built-in prompts follow the interface locale; edited prompts remain untouched. */
export function localizeDefaultAgentPrompt(agentId: AgentId, prompt: string, locale: AgentPromptLocale): string {
  const matchesBuiltInPrompt = Object.values(defaultAgentPrompts).some((prompts) => prompts[agentId] === prompt);
  return matchesBuiltInPrompt ? defaultAgentPrompts[locale][agentId] : prompt;
}

export function localizeDefaultAgentPrompts(configs: AgentConfigMap, locale: AgentPromptLocale): AgentConfigMap {
  return Object.fromEntries(AGENT_IDS.map((agentId) => [agentId, {
    ...configs[agentId],
    prompt: localizeDefaultAgentPrompt(agentId, configs[agentId].prompt, locale)
  }])) as AgentConfigMap;
}

export const defaultAgentConfigs: AgentConfigMap = {
  'MELCHIOR-1': {
    agentId: 'MELCHIOR-1',
    role: '科学者論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('MELCHIOR-1'),
    apiKey: '',
    prompt: defaultAgentPrompts['ja-JP']['MELCHIOR-1']
  },
  'BALTHASAR-2': {
    agentId: 'BALTHASAR-2',
    role: '母性論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('BALTHASAR-2'),
    apiKey: '',
    prompt: defaultAgentPrompts['ja-JP']['BALTHASAR-2']
  },
  'CASPER-3': {
    agentId: 'CASPER-3',
    role: '女性論理',
    connection: 'mock',
    baseUrl: MOCK_CONNECTION_BASE_URL,
    model: mockModelFor('CASPER-3'),
    apiKey: '',
    prompt: defaultAgentPrompts['ja-JP']['CASPER-3']
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
