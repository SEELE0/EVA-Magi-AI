/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import {
  AGENT_IDS,
  type Agent,
  type AgentHealth,
  type Decision,
  type DecisionEvent,
  type DecisionRequest,
  type DecisionStatus,
  type EventKind,
  type SystemStatus,
  type Verdict,
  type Vote
} from '../domain/decision';
import {
  DecisionServiceError,
  type DecisionRequestOptions,
  type DecisionService
} from './decision-service';

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const agentHealthValues: AgentHealth[] = ['nominal', 'degraded', 'offline'];
const voteValues: Vote[] = ['approve', 'reject', 'abstain', 'pending'];
const decisionStatusValues: DecisionStatus[] = ['draft', 'running', 'completed', 'failed'];
const verdictValues: Verdict[] = ['approved', 'rejected', 'review', 'pending'];
const eventKindValues: EventKind[] = ['created', 'scan', 'vote', 'verdict', 'failure'];

interface HttpDecisionServiceOptions {
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isAgent(value: unknown): value is Agent {
  return isRecord(value)
    && isOneOf(AGENT_IDS, value.id)
    && isString(value.role)
    && isOneOf(agentHealthValues, value.health)
    && isNumber(value.latencyMs)
    && isOneOf(voteValues, value.vote);
}

function isVotes(value: unknown): value is Decision['votes'] {
  return isRecord(value) && AGENT_IDS.every((agentId) => isOneOf(voteValues, value[agentId]));
}

function isDecision(value: unknown): value is Decision {
  return isRecord(value)
    && isString(value.id)
    && isString(value.subject)
    && isOneOf(['low', 'normal', 'critical'], value.priority)
    && isOneOf(decisionStatusValues, value.status)
    && isOneOf(verdictValues, value.verdict)
    && isVotes(value.votes)
    && isString(value.createdAt)
    && (value.completedAt === undefined || isString(value.completedAt));
}

function isDecisionEvent(value: unknown): value is DecisionEvent {
  return isRecord(value)
    && isString(value.id)
    && isString(value.decisionId)
    && isOneOf(eventKindValues, value.kind)
    && isString(value.timestamp)
    && isString(value.message)
    && (value.agentId === undefined || isOneOf(AGENT_IDS, value.agentId));
}

function isSystemStatus(value: unknown): value is SystemStatus {
  return isRecord(value)
    && isString(value.systemName)
    && isOneOf(['online', 'degraded', 'offline'], value.connection)
    && isOneOf(['mock', 'remote'], value.source)
    && isString(value.protocol)
    && isNumber(value.uptimeSeconds)
    && isString(value.updatedAt)
    && (value.notice === undefined || isString(value.notice));
}

function invalidResponse(path: string) {
  return new DecisionServiceError(`MAGI 后端返回了无效响应：${path}`, 'INVALID_RESPONSE');
}

export class HttpDecisionService implements DecisionService {
  private readonly timeoutMs: number;

  constructor(
    private readonly baseUrl: string,
    options: HttpDecisionServiceOptions = {}
  ) {
    this.timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
  }

  getSystemStatus(options?: DecisionRequestOptions) {
    return this.request<SystemStatus>('/v1/system/status', options, isSystemStatus);
  }

  getAgents(options?: DecisionRequestOptions) {
    return this.request<Agent[]>('/v1/agents', options, (value): value is Agent[] => Array.isArray(value) && value.every(isAgent));
  }

  createDecision(request: DecisionRequest, options?: DecisionRequestOptions) {
    return this.request<Decision>('/v1/decisions', options, isDecision, { method: 'POST', body: request });
  }

  getDecision(decisionId: string, options?: DecisionRequestOptions) {
    return this.request<Decision>(`/v1/decisions/${encodeURIComponent(decisionId)}`, options, isDecision);
  }

  executeDecision(decisionId: string, options?: DecisionRequestOptions) {
    return this.request<Decision>(`/v1/decisions/${encodeURIComponent(decisionId)}/execute`, options, isDecision, { method: 'POST' });
  }

  getEvents(decisionId: string, options?: DecisionRequestOptions) {
    return this.request<DecisionEvent[]>(`/v1/decisions/${encodeURIComponent(decisionId)}/events`, options, (value): value is DecisionEvent[] => Array.isArray(value) && value.every(isDecisionEvent));
  }

  private async request<T>(
    path: string,
    options: DecisionRequestOptions | undefined,
    validate: (value: unknown) => value is T,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);
    const forwardAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', forwardAbort, { once: true });

    if (options?.signal?.aborted) controller.abort();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
        const status = response.status;
        throw new DecisionServiceError(
          payload?.error?.message ?? 'MAGI 后端请求失败。',
          payload?.error?.code ?? `HTTP_${status}`,
          { status, retryable: status === 408 || status === 425 || status === 429 || status >= 500 }
        );
      }

      const payload = await response.json().catch(() => null);
      if (!validate(payload)) throw invalidResponse(path);
      return payload;
    } catch (error) {
      if (error instanceof DecisionServiceError) throw error;
      if (options?.signal?.aborted) {
        throw new DecisionServiceError('MAGI 请求已取消。', 'REQUEST_ABORTED');
      }
      if (controller.signal.aborted) {
        throw new DecisionServiceError('MAGI 后端请求超时。', 'REQUEST_TIMEOUT', { retryable: true });
      }
      throw new DecisionServiceError('无法连接到 MAGI 后端服务。', 'NETWORK_UNAVAILABLE', { retryable: true });
    } finally {
      globalThis.clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', forwardAbort);
    }
  }
}
