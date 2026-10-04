/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { AgentRuntimeConfig, AgentConnectionMode } from '../domain/agent-config';
import type { DecisionRequest, Vote } from '../domain/decision';

export interface ProviderResult {
  vote: Exclude<Vote, 'pending'>;
  response: string;
}

export interface AgentProvider {
  validate(config: AgentRuntimeConfig): void;
  invoke(config: AgentRuntimeConfig, request: DecisionRequest, signal: AbortSignal,
    onProgress?: (response: string) => void): Promise<ProviderResult>;
}

export type AgentProviders = Record<AgentConnectionMode, AgentProvider>;
