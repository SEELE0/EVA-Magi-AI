/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import type {
  Agent,
  Decision,
  DecisionEvent,
  DecisionRequest,
  SystemStatus
} from '../domain/decision';

export interface DecisionService {
  getSystemStatus(): Promise<SystemStatus>;
  getAgents(): Promise<Agent[]>;
  createDecision(request: DecisionRequest): Promise<Decision>;
  getDecision(decisionId: string): Promise<Decision>;
  executeDecision(decisionId: string): Promise<Decision>;
  getEvents(decisionId: string): Promise<DecisionEvent[]>;
}

export class DecisionServiceError extends Error {
  constructor(
    message: string,
    public readonly code = 'SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'DecisionServiceError';
  }
}
