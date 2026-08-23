/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { describe, expect, it } from 'vitest';
import type { Agent, Decision, DecisionEvent, DecisionRequest, SystemStatus } from '../domain/decision';
import { DecisionServiceError, type DecisionService } from './decision-service';
import { ResilientDecisionService } from './resilient-decision-service';

class UnavailableService implements DecisionService {
  private unavailable(): never {
    throw new DecisionServiceError('network unavailable', 'NETWORK_UNAVAILABLE', { retryable: true });
  }
  getSystemStatus(): Promise<SystemStatus> { return Promise.reject(this.unavailable()); }
  getAgents(): Promise<Agent[]> { return Promise.reject(this.unavailable()); }
  createDecision(_request: DecisionRequest): Promise<Decision> { return Promise.reject(this.unavailable()); }
  getDecision(_decisionId: string): Promise<Decision> { return Promise.reject(this.unavailable()); }
  executeDecision(_decisionId: string): Promise<Decision> { return Promise.reject(this.unavailable()); }
  getEvents(_decisionId: string): Promise<DecisionEvent[]> { return Promise.reject(this.unavailable()); }
}

class BusinessErrorService extends UnavailableService {
  getSystemStatus(): Promise<SystemStatus> {
    return Promise.reject(new DecisionServiceError('invalid request', 'INVALID_REQUEST', { status: 422 }));
  }
}

class LocalService implements DecisionService {
  async getSystemStatus(): Promise<SystemStatus> {
    return { systemName: 'MAGI', connection: 'online', source: 'mock', protocol: 'LOCAL', uptimeSeconds: 1, updatedAt: new Date().toISOString() };
  }
  async getAgents(): Promise<Agent[]> { return []; }
  async createDecision(_request: DecisionRequest): Promise<Decision> { throw new Error('not needed'); }
  async getDecision(_decisionId: string): Promise<Decision> { throw new Error('not needed'); }
  async executeDecision(_decisionId: string): Promise<Decision> { throw new Error('not needed'); }
  async getEvents(_decisionId: string): Promise<DecisionEvent[]> { return []; }
}

describe('ResilientDecisionService', () => {
  it('automatically reports local fallback when remote status is unavailable', async () => {
    const service = new ResilientDecisionService(new UnavailableService(), new LocalService());
    const status = await service.getSystemStatus();

    expect(status.connection).toBe('degraded');
    expect(status.source).toBe('mock');
    expect(status.notice).toContain('LOCAL EMULATOR');
  });

  it('does not hide a remote business error behind the local emulator', async () => {
    const service = new ResilientDecisionService(new BusinessErrorService(), new LocalService());

    await expect(service.getSystemStatus()).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      status: 422,
      retryable: false
    });
  });
});
