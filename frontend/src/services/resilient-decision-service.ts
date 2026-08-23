/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import type { Agent, Decision, DecisionEvent, DecisionRequest, SystemStatus } from '../domain/decision';
import { canFallbackToLocal, type DecisionRequestOptions, type DecisionService } from './decision-service';

/** Falls back once when the optional remote endpoint is unavailable. */
export class ResilientDecisionService implements DecisionService {
  private usingFallback = false;

  constructor(
    private readonly primary: DecisionService,
    private readonly fallback: DecisionService
  ) {}

  async getSystemStatus(options?: DecisionRequestOptions): Promise<SystemStatus> {
    try {
      const status = await this.active().getSystemStatus(options);
      return this.usingFallback
        ? { ...status, connection: 'degraded', notice: 'REMOTE UNAVAILABLE: LOCAL EMULATOR ACTIVE' }
        : status;
    } catch (error) {
      if (this.usingFallback || !canFallbackToLocal(error)) throw error;
      this.usingFallback = true;
      const status = await this.fallback.getSystemStatus(options);
      return { ...status, connection: 'degraded', notice: 'REMOTE UNAVAILABLE: LOCAL EMULATOR ACTIVE' };
    }
  }

  getAgents(options?: DecisionRequestOptions): Promise<Agent[]> {
    return this.withFallback((service) => service.getAgents(options));
  }

  createDecision(request: DecisionRequest, options?: DecisionRequestOptions): Promise<Decision> {
    return this.withFallback((service) => service.createDecision(request, options));
  }

  getDecision(decisionId: string, options?: DecisionRequestOptions): Promise<Decision> {
    return this.withFallback((service) => service.getDecision(decisionId, options));
  }

  executeDecision(decisionId: string, options?: DecisionRequestOptions): Promise<Decision> {
    return this.withFallback((service) => service.executeDecision(decisionId, options));
  }

  getEvents(decisionId: string, options?: DecisionRequestOptions): Promise<DecisionEvent[]> {
    return this.withFallback((service) => service.getEvents(decisionId, options));
  }

  private active() { return this.usingFallback ? this.fallback : this.primary; }

  private async withFallback<T>(operation: (service: DecisionService) => Promise<T>): Promise<T> {
    try {
      return await operation(this.active());
    } catch (error) {
      if (this.usingFallback || !canFallbackToLocal(error)) throw error;
      this.usingFallback = true;
      return operation(this.fallback);
    }
  }
}
