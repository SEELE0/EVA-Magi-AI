/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { AgentPublicMetadata, AgentConnectionMode, AgentRuntimeConfig, AgentConfigMap } from '../../domain/agent-config';

// Presentation types retain the existing feature exports.
export type { AgentConnectionMode, AgentRuntimeConfig, AgentConfigMap, AgentPublicMetadata };

export type { AgentHistoryResult, DecisionHistoryEntry } from '../../domain/decision-history';

export type SimulatorRoute =
  | { name: 'decision' }
  | { name: 'history' }
  | { name: 'history-detail'; id: string };
