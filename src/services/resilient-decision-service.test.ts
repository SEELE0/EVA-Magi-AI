import { describe, expect, it } from 'vitest';
import type { Agent, Decision, DecisionEvent, DecisionRequest, SystemStatus } from '../domain/decision';
import type { DecisionService } from './decision-service';
import { ResilientDecisionService } from './resilient-decision-service';

class UnavailableService implements DecisionService {
  private unavailable(): never { throw new Error('network unavailable'); }
  getSystemStatus(): Promise<SystemStatus> { return Promise.reject(this.unavailable()); }
  getAgents(): Promise<Agent[]> { return Promise.reject(this.unavailable()); }
  createDecision(_request: DecisionRequest): Promise<Decision> { return Promise.reject(this.unavailable()); }
  getDecision(_decisionId: string): Promise<Decision> { return Promise.reject(this.unavailable()); }
  executeDecision(_decisionId: string): Promise<Decision> { return Promise.reject(this.unavailable()); }
  getEvents(_decisionId: string): Promise<DecisionEvent[]> { return Promise.reject(this.unavailable()); }
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
});
