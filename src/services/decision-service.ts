import type {
  Agent,
  Decision,
  DecisionEvent,
  DecisionRequest,
  SystemStatus
} from '../domain';

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
