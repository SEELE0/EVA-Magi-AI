/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type AgentId } from './decision';
import { cloneAgentConfigs, mockModelFor, type AgentConfigMap, type AgentRuntimeConfig } from './agent-config';
import { EVA_BACKGROUND } from './setting-book';

export { EVA_BACKGROUND };

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

/** An explicit overall save applies its connection to every node, removing old overrides. */
export function applyGlobalConnection(settings: SharedSettings, global: AgentRuntimeConfig): SharedSettings {
  const nodes = cloneAgentConfigs(settings.nodes);
  for (const id of AGENT_IDS) {
    nodes[id] = { ...nodes[id], connection: global.connection, baseUrl: global.baseUrl,
      model: global.connection === 'mock' ? mockModelFor(id) : global.model, apiKey: '' };
  }
  return { ...settings, global: { ...global }, nodes,
    sources: Object.fromEntries(AGENT_IDS.map(id => [id, 'global'])) as SharedSettings['sources'] };
}

/** Compare the actual completion endpoint, including its path, before sharing credentials. */
export function sameApiService(left: AgentRuntimeConfig, right: AgentRuntimeConfig): boolean {
  if (left.connection === 'mock' || right.connection === 'mock') return false;
  function endpoint(baseUrl: string): string | null {
    try {
      const url = new URL(baseUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
      const path = url.pathname.replace(/\/+$/, '');
      url.pathname = path.endsWith('/chat/completions') ? path : `${path || '/v1'}/chat/completions`;
      return url.href;
    } catch { return null; }
  }
  const target = endpoint(left.baseUrl);
  return target !== null && target === endpoint(right.baseUrl);
}

function connectionSource(settings: SharedSettings, agentId: AgentId, trail = new Set<AgentId>()): AgentRuntimeConfig {
  const source = settings.sources[agentId] ?? agentId;
  if (source === 'global') return settings.global;
  if (source === agentId || trail.has(agentId)) return settings.nodes[agentId];
  return connectionSource(settings, source, new Set([...trail, agentId]));
}

/** Return the saved connection profile before mock-mode runtime values are applied. */
export function getAgentConnectionConfig(settings: SharedSettings, agentId: AgentId): AgentRuntimeConfig {
  return connectionSource(settings, agentId);
}

export function resolveAgentConfigs(settings: SharedSettings): AgentConfigMap {
  const result = cloneAgentConfigs(settings.nodes);
  for (const id of AGENT_IDS) {
    const connection = connectionSource(settings, id);
    result[id] = {
      ...result[id],
      connection: connection.connection,
      baseUrl: connection.baseUrl,
      model: connection.connection === 'mock' ? mockModelFor(id) : connection.model,
      apiKey: connection.apiKey.trim() || !sameApiService(connection, settings.global)
        ? connection.apiKey : settings.global.apiKey
    };
  }
  return result;
}

/** Saving a model/Prompt edit must not turn a borrowed global key into a stale node-owned key. */
export function prepareNodeConfig(settings: SharedSettings, config: AgentRuntimeConfig): AgentRuntimeConfig {
  const previous = connectionSource(settings, config.agentId);
  const borrowsGlobalKey = previous === settings.global
    || (!previous.apiKey.trim() && sameApiService(previous, settings.global));
  const unchangedKey = config.apiKey === resolveAgentConfigs(settings)[config.agentId].apiKey;
  return { ...config, apiKey: borrowsGlobalKey && unchangedKey ? '' : config.apiKey };
}
