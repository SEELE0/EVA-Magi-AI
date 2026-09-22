/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { AgentConnectionMode } from '../../domain/agent-config';

// UI labels stay here; configuration belongs to the domain layer.
export {
  cloneAgentConfigs,
  defaultAgentConfigs,
  toPublicAgentMetadata,
  serializeAgentConfigsForStorage,
  MOCK_CONNECTION_BASE_URL,
  mockModelFor,
  countLiveAgents
} from '../../domain/agent-config';
export type {
  AgentConnectionMode,
  AgentRuntimeConfig,
  AgentConfigMap,
  AgentPublicMetadata
} from '../../domain/agent-config';

export const connectionModeCopy: Record<AgentConnectionMode, string> = {
  mock: '模擬',
  'openai-compatible': 'OpenAI互換',
  'local-compatible': 'ローカル互換'
};
