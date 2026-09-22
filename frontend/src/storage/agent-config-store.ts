/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { AGENT_IDS, type AgentId } from '../domain/decision';
import {
  cloneAgentConfigs,
  serializeAgentConfigsForStorage,
  type AgentConfigMap,
  type AgentConnectionMode
} from '../domain/agent-config';

export const AGENT_CONFIG_STORAGE_KEY = 'magi-nerv:agent-configs:v1';
const MAX_FIELD_LENGTHS: Record<'baseUrl' | 'model' | 'prompt', number> = {
  baseUrl: 500,
  model: 200,
  prompt: 12_000
};

const connectionModes: AgentConnectionMode[] = ['mock', 'openai-compatible', 'local-compatible'];

interface ConfigStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): ConfigStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function clamp(text: unknown, maxLength: number): string | null {
  if (typeof text !== 'string') return null;
  return text.slice(0, maxLength);
}

type PersistedConfig = Partial<Pick<AgentConfigMap[AgentId], 'connection' | 'baseUrl' | 'model' | 'prompt'>>;

function readPersistedConfig(value: unknown): PersistedConfig {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as Record<string, unknown>;

  const persisted: PersistedConfig = {};
  if (connectionModes.includes(candidate.connection as AgentConnectionMode)) {
    persisted.connection = candidate.connection as AgentConnectionMode;
  }
  const baseUrl = clamp(candidate.baseUrl, MAX_FIELD_LENGTHS.baseUrl);
  if (baseUrl !== null) persisted.baseUrl = baseUrl;
  const model = clamp(candidate.model, MAX_FIELD_LENGTHS.model);
  if (model !== null) persisted.model = model;
  const prompt = clamp(candidate.prompt, MAX_FIELD_LENGTHS.prompt);
  if (prompt !== null) persisted.prompt = prompt;
  return persisted;
}

/**
 * API KEY 以外のノード設定を読み戻す。鍵は保存されていないため、
 * 再読み込み後も実 API を使うには利用者が再入力する必要がある。
 */
export function loadAgentConfigs(storage: ConfigStorage | null = browserStorage()): AgentConfigMap {
  const configs = cloneAgentConfigs();
  if (!storage) return configs;

  try {
    const raw = storage.getItem(AGENT_CONFIG_STORAGE_KEY);
    if (!raw) return configs;
    const parsed = JSON.parse(raw) as { version?: number; configs?: Record<string, unknown> };
    if (parsed.version !== 1 || !parsed.configs) return configs;

    for (const agentId of AGENT_IDS) {
      const persisted = readPersistedConfig(parsed.configs[agentId]);
      if (!persisted) continue;
      configs[agentId] = {
        ...configs[agentId],
        ...persisted,
        // 哨兵値が壊れた保存に混入した場合は既定へ戻す
        baseUrl: persisted.baseUrl ?? (persisted.connection && persisted.connection !== 'mock'
          ? ''
          : configs[agentId].baseUrl),
        apiKey: ''
      };
    }
    return configs;
  } catch {
    return configs;
  }
}

export function saveAgentConfigs(configs: AgentConfigMap, storage: ConfigStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(AGENT_CONFIG_STORAGE_KEY, serializeAgentConfigsForStorage(configs));
    return true;
  } catch {
    return false;
  }
}
