/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type AgentId } from './decision';
import { cloneAgentConfigs, mockModelFor, type AgentConfigMap, type AgentRuntimeConfig } from './agent-config';

export const EVA_BACKGROUND = `世界观：EVA / NERV / MAGI
你们是特务机关 NERV 的 MAGI 决策系统，共同分析议题并给出独立判断。
MAGI 由 MELCHIOR-1、BALTHASAR-2、CASPER-3 三个节点组成，分别保留科学者、母亲与女性的视角。
以使徒威胁、组织责任与人类生存为世界观背景，但不得将虚构设定当作现实事实。对现实议题仍应依据可核实的信息。
共享背景不替代各节点的角色卡；允许不同意见，明确不确定性、风险与可执行建议。`;

/** 每个节点从哪个连接配置档读取连接信息。节点自身代表独立配置。 */
export type AgentConfigSource = 'global' | AgentId;

export interface SharedSettings {
  background: string;
  global: AgentRuntimeConfig;
  sources: Record<AgentId, AgentConfigSource>;
  nodes: AgentConfigMap;
}

export function defaultSharedSettings(nodes = cloneAgentConfigs(), legacy = false): SharedSettings {
  return { background: EVA_BACKGROUND, global: { ...cloneAgentConfigs()['MELCHIOR-1'] }, nodes,
    sources: Object.fromEntries(AGENT_IDS.map(id => [id, legacy ? id : 'global'])) as Record<AgentId, AgentConfigSource> };
}

export function resolveAgentConfigs(settings: SharedSettings): AgentConfigMap {
  const result = cloneAgentConfigs(settings.nodes);

  function connectionFrom(config: AgentRuntimeConfig, agentId: AgentId): Pick<AgentRuntimeConfig, 'connection' | 'baseUrl' | 'model' | 'apiKey'> {
    return {
      connection: config.connection,
      baseUrl: config.baseUrl,
      model: config.connection === 'mock' ? mockModelFor(agentId) : config.model,
      apiKey: config.apiKey
    };
  }

  function resolveSource(agentId: AgentId, trail: Set<AgentId>): Pick<AgentRuntimeConfig, 'connection' | 'baseUrl' | 'model' | 'apiKey'> {
    const source = settings.sources[agentId] ?? agentId;
    if (source === 'global') return connectionFrom(settings.global, agentId);
    if (source === agentId || trail.has(agentId)) return connectionFrom(settings.nodes[agentId], agentId);
    return resolveSource(source, new Set([...trail, agentId]));
  }

  for (const id of AGENT_IDS) {
    result[id] = { ...result[id], ...resolveSource(id, new Set()) };
  }
  return result;
}
