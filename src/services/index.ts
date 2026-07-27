import type { ConnectionMode } from '../domain';
import type { DecisionService } from './decision-service';
import { HttpDecisionService } from './http-decision-service';
import { MockDecisionService } from './mock-decision-service';
import { ResilientDecisionService } from './resilient-decision-service';

export function createDecisionService(): DecisionService {
  const mode = (import.meta.env.VITE_API_MODE ?? 'mock') as ConnectionMode;
  const mock = new MockDecisionService();
  if (mode !== 'remote') return mock;
  return new ResilientDecisionService(
    new HttpDecisionService(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'),
    mock
  );
}
