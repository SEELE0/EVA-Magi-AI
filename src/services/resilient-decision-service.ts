import type { Agent, Decision, DecisionEvent, DecisionRequest, SystemStatus } from '../domain/decision';
import type { DecisionService } from './decision-service';

/** Falls back once when the optional remote endpoint is unavailable. */
export class ResilientDecisionService implements DecisionService {
  private usingFallback = false;

  constructor(
    private readonly primary: DecisionService,
    private readonly fallback: DecisionService
  ) {}

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const status = await this.active().getSystemStatus();
      return this.usingFallback
        ? { ...status, connection: 'degraded', notice: 'REMOTE UNAVAILABLE: LOCAL EMULATOR ACTIVE' }
        : status;
    } catch {
      this.usingFallback = true;
      const status = await this.fallback.getSystemStatus();
      return { ...status, connection: 'degraded', notice: 'REMOTE UNAVAILABLE: LOCAL EMULATOR ACTIVE' };
    }
  }

  getAgents(): Promise<Agent[]> { return this.withFallback((service) => service.getAgents()); }
  createDecision(request: DecisionRequest): Promise<Decision> { return this.withFallback((service) => service.createDecision(request)); }
  getDecision(decisionId: string): Promise<Decision> { return this.withFallback((service) => service.getDecision(decisionId)); }
  executeDecision(decisionId: string): Promise<Decision> { return this.withFallback((service) => service.executeDecision(decisionId)); }
  getEvents(decisionId: string): Promise<DecisionEvent[]> { return this.withFallback((service) => service.getEvents(decisionId)); }

  private active() { return this.usingFallback ? this.fallback : this.primary; }

  private async withFallback<T>(operation: (service: DecisionService) => Promise<T>): Promise<T> {
    try {
      return await operation(this.active());
    } catch (error) {
      if (this.usingFallback) throw error;
      this.usingFallback = true;
      return operation(this.fallback);
    }
  }
}
