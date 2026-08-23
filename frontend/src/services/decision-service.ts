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

export interface DecisionRequestOptions {
  signal?: AbortSignal;
}

export interface DecisionService {
  getSystemStatus(options?: DecisionRequestOptions): Promise<SystemStatus>;
  getAgents(options?: DecisionRequestOptions): Promise<Agent[]>;
  createDecision(request: DecisionRequest, options?: DecisionRequestOptions): Promise<Decision>;
  getDecision(decisionId: string, options?: DecisionRequestOptions): Promise<Decision>;
  executeDecision(decisionId: string, options?: DecisionRequestOptions): Promise<Decision>;
  getEvents(decisionId: string, options?: DecisionRequestOptions): Promise<DecisionEvent[]>;
}

export interface DecisionServiceErrorOptions {
  retryable?: boolean;
  status?: number;
}

export class DecisionServiceError extends Error {
  constructor(
    message: string,
    public readonly code = 'SERVICE_ERROR',
    options: DecisionServiceErrorOptions = {}
  ) {
    super(message);
    this.name = 'DecisionServiceError';
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }

  public readonly retryable: boolean;
  public readonly status?: number;
}

export function canFallbackToLocal(error: unknown): error is DecisionServiceError {
  return error instanceof DecisionServiceError && error.retryable;
}
