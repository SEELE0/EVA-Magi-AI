/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { DecisionEngine, type AgentConfigsProvider } from '../application/decision-engine';
import { cloneAgentConfigs } from '../domain/agent-config';
import { ChatCompletionsProvider } from '../providers/chat-completions-provider';
import { MockProvider } from '../providers/mock-provider';
import { HttpDecisionService } from './http-decision-service';
import type { DecisionService } from './decision-service';

export function createDecisionService(configsProvider: AgentConfigsProvider = cloneAgentConfigs): DecisionService {
  if (import.meta.env.VITE_API_MODE === 'remote') return new HttpDecisionService(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000');
  const chat = new ChatCompletionsProvider();
  return new DecisionEngine(configsProvider, { mock: new MockProvider(), 'openai-compatible': chat, 'local-compatible': chat });
}
export type { AgentConfigsProvider };
