import type { Agent, Decision, DecisionEvent, DecisionRequest, SystemStatus } from '../domain/decision';
import { DecisionServiceError, type DecisionService } from './decision-service';

export class HttpDecisionService implements DecisionService {
  constructor(private readonly baseUrl: string) {}

  getSystemStatus() {
    return this.request<SystemStatus>('/v1/system/status');
  }

  getAgents() {
    return this.request<Agent[]>('/v1/agents');
  }

  createDecision(request: DecisionRequest) {
    return this.request<Decision>('/v1/decisions', { method: 'POST', body: request });
  }

  getDecision(decisionId: string) {
    return this.request<Decision>(`/v1/decisions/${encodeURIComponent(decisionId)}`);
  }

  executeDecision(decisionId: string) {
    return this.request<Decision>(`/v1/decisions/${encodeURIComponent(decisionId)}/execute`, { method: 'POST' });
  }

  getEvents(decisionId: string) {
    return this.request<DecisionEvent[]>(`/v1/decisions/${encodeURIComponent(decisionId)}/events`);
  }

  private async request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method: init.method ?? 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: init.body ? JSON.stringify(init.body) : undefined
      });
    } catch {
      throw new DecisionServiceError('无法连接到 MAGI 后端服务。', 'NETWORK_UNAVAILABLE');
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
      throw new DecisionServiceError(payload?.error?.message ?? 'MAGI 后端请求失败。', payload?.error?.code ?? 'HTTP_ERROR');
    }
    return response.json() as Promise<T>;
  }
}
