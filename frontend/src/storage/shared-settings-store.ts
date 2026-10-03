/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type AgentId } from '../domain/decision';
import { defaultSharedSettings, type AgentConfigSource, type SharedSettings } from '../domain/shared-settings';
import { redactSecrets } from '../domain/redact-secrets';
import { AGENT_CONFIG_STORAGE_KEY, loadAgentConfigs } from './agent-config-store';

export const SHARED_SETTINGS_KEY = 'magi-nerv:shared-settings:v1';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
export function loadSharedSettings(storage: Storage | null = browserStorage()): SharedSettings {
  const fallback = defaultSharedSettings(loadAgentConfigs(storage));
  if (!storage) return fallback;
  try {
    fallback.sources = defaultSharedSettings(fallback.nodes, !!storage.getItem(AGENT_CONFIG_STORAGE_KEY)).sources;
    const data = JSON.parse(storage.getItem(SHARED_SETTINGS_KEY) ?? 'null');
    if (data?.version !== 1 || !data.settings) return fallback;
    const value = data.settings;
    const readNodes = (nodes: unknown) => loadAgentConfigs({ getItem: () => JSON.stringify({ version: 1, configs: nodes }), setItem: () => {} });
    const sources = Object.fromEntries(AGENT_IDS.map((id) => {
      const candidate = value.sources?.[id];
      if (candidate === 'global' || AGENT_IDS.includes(candidate as AgentId)) return [id, candidate as AgentConfigSource];
      // v1 used a boolean independent flag. Preserve its meaning during migration.
      if (typeof value.independent?.[id] === 'boolean') return [id, value.independent[id] ? id : 'global'];
      return [id, fallback.sources[id]];
    })) as SharedSettings['sources'];
    return {
      background: typeof value.background === 'string' ? value.background : fallback.background,
      global: readNodes({ 'MELCHIOR-1': value.global })['MELCHIOR-1'],
      nodes: readNodes(value.nodes),
      sources
    };
  } catch { return fallback; }
}
export function saveSharedSettings(settings: SharedSettings, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    const secrets = [settings.global.apiKey, ...AGENT_IDS.map(id => settings.nodes[id].apiKey)];
    storage.setItem(SHARED_SETTINGS_KEY, JSON.stringify({ version: 1, settings: redactSecrets(settings, secrets) }));
    return true;
  } catch { return false; }
}
