/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type AgentId } from './decision';
import { cloneAgentConfigs, mockModelFor, type AgentConfigMap, type AgentRuntimeConfig } from './agent-config';
import evaBackground from './eva-tv-reference-draft.md?raw';

export const EVA_BACKGROUND = evaBackground.trim();

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
