/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type Decision, type DecisionEvent, type DecisionRequest } from '../domain/decision';
import { agentDisplayName, agentRole, cloneAgentConfigs, type AgentConfigMap } from '../domain/agent-config';
import { redactSecrets, redactStreamingSecrets } from '../domain/redact-secrets';
import { aggregateVerdict } from '../domain/verdict';
import { throwIfAborted } from './abort';
import { DecisionServiceError, type DecisionService, type DecisionRequestOptions } from './decision-service';
import type { AgentProviders } from './agent-provider';

export type AgentConfigsProvider = () => AgentConfigMap;
type Entry = { decision: Decision; request: DecisionRequest; events: DecisionEvent[] };

export class DecisionEngine implements DecisionService {
  private records = new Map<string, Entry>();
  private startedAt = Date.now();
  private latestId?: string;
  constructor(private getConfigs: AgentConfigsProvider, private providers: AgentProviders) {}
  async getSystemStatus(options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    const live = AGENT_IDS.some(id => this.getConfigs()[id].connection !== 'mock');
    const failed = this.latestId ? this.records.get(this.latestId)?.decision.status === 'failed' : false;
    return { systemName: 'MAGI', connection: failed ? 'degraded' as const : 'online' as const, source: live ? 'remote' as const : 'mock' as const,
      protocol: 'BROWSER / MAGI', uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000), updatedAt: new Date().toISOString(),
      notice: failed ? '判定失敗 · 履歴を確認してください' : live ? '外部 API 設定済み · 接続は実行時に確認' : '模擬回線 · MOCK' };
  }
  async getAgents(options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    const decision = this.latestId ? this.records.get(this.latestId)?.decision : undefined;
    const configs = this.getConfigs();
    return AGENT_IDS.map(id => ({ id, role: configs[id].role,
      displayName: agentDisplayName(configs[id], id),
      health: decision?.failures?.[id] ? 'offline' as const : 'nominal' as const,
      latencyMs: decision?.outputs?.[id]?.latencyMs ?? 0, vote: decision?.votes[id] ?? 'pending' as const }));
  }
  private record(id: string) {
    const entry = this.records.get(id);
    if (!entry) throw new DecisionServiceError('判定が見つかりません。', 'NOT_FOUND');
    return entry;
  }
  private event(entry: Entry, kind: DecisionEvent['kind'], message: string, agentId?: DecisionEvent['agentId']) {
    entry.events.push({ id: crypto.randomUUID(), decisionId: entry.decision.id, kind, message, agentId, timestamp: new Date().toISOString() });
  }
  private normalizeOutput(output: unknown): { vote: 'approve' | 'reject' | 'abstain'; response: string } {
    if (!output || typeof output !== 'object') throw new DecisionServiceError('节点没有返回有效结果。', 'INVALID_AGENT_RESULT');
    const candidate = output as { vote?: unknown; response?: unknown };
    if ((candidate.vote !== 'approve' && candidate.vote !== 'reject' && candidate.vote !== 'abstain')
      || typeof candidate.response !== 'string' || !candidate.response.trim() || candidate.response.length > 32_000) {
      throw new DecisionServiceError('节点没有返回有效结果。', 'INVALID_AGENT_RESULT');
    }
    return { vote: candidate.vote, response: candidate.response.trim() };
  }
  async createDecision(request: DecisionRequest, options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    if (!request.subject.trim() || request.subject.trim().length > 240 || !['low', 'normal', 'critical'].includes(request.priority)) {
      throw new DecisionServiceError('議題と優先度を確認してください。', 'INVALID_REQUEST');
    }
    for (const [id, entry] of this.records) {
      if (this.records.size < 60) break;
      if (entry.decision.status !== 'running') this.records.delete(id);
    }
    if (this.records.size >= 60) throw new DecisionServiceError('実行中の判定が多すぎます。', 'BUSY');
    const decision: Decision = { id: crypto.randomUUID(), subject: request.subject.trim(), priority: request.priority,
      status: 'draft', verdict: 'pending', votes: { 'MELCHIOR-1': 'pending', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' }, createdAt: new Date().toISOString(), outputs: {}, responses: {}, failures: {} };
    const entry: Entry = { decision, request: { ...request, subject: decision.subject }, events: [] };
    this.records.set(decision.id, entry);
    this.event(entry, 'created', '判定を作成しました。');
    return structuredClone(decision);
  }
  async getDecision(id: string, options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    return structuredClone(this.record(id).decision);
  }
  async getEvents(id: string, options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    return structuredClone(this.record(id).events);
  }
  async executeDecision(id: string, options?: DecisionRequestOptions) {
    throwIfAborted(options?.signal);
    const entry = this.record(id);
    if (entry.decision.status !== 'draft') return structuredClone(entry.decision);
    const configs = cloneAgentConfigs(this.getConfigs());
    for (const agentId of AGENT_IDS) this.providers[configs[agentId].connection].validate(configs[agentId]);
    const secrets = AGENT_IDS.map(agentId => configs[agentId].apiKey);
    entry.decision.agentNames = redactSecrets(Object.fromEntries(AGENT_IDS.map(agentId =>
      [agentId, agentDisplayName(configs[agentId], agentId)])) as Record<typeof AGENT_IDS[number], string>, secrets);
    entry.decision.agentRoles = redactSecrets(Object.fromEntries(AGENT_IDS.map(agentId =>
      [agentId, agentRole(configs[agentId], agentId)])) as Record<typeof AGENT_IDS[number], string>, secrets);
    entry.decision.subject = redactSecrets(entry.decision.subject, secrets);
    entry.request.subject = entry.decision.subject;
    entry.decision.status = 'running';
    entry.decision.partialResponses = {};
    this.latestId = id;
    this.event(entry, 'scan', 'ノード判定を開始しました。');
    const controller = new AbortController();
    const abort = () => controller.abort();
    options?.signal?.addEventListener('abort', abort, { once: true });
    const running = structuredClone(entry.decision);
    void Promise.all(AGENT_IDS.map(async agentId => {
      const config = { ...configs[agentId], agentId };
      const start = Date.now();
      try {
        const output = this.normalizeOutput(await this.providers[config.connection].invoke(config, entry.request, controller.signal, (response) => {
          if (controller.signal.aborted || entry.decision.status !== 'running') return;
          entry.decision.partialResponses![agentId] = redactStreamingSecrets(response.slice(0, 32_000), secrets);
        }));
        throwIfAborted(controller.signal);
        const safe = redactSecrets({ agentId, displayName: entry.decision.agentNames![agentId], role: entry.decision.agentRoles![agentId], vote: output.vote, response: output.response,
          connection: config.connection, baseUrl: config.baseUrl, model: config.model, latencyMs: Date.now() - start }, secrets);
        entry.decision.outputs![agentId] = safe;
        entry.decision.responses![agentId] = safe.response;
        entry.decision.votes[agentId] = safe.vote;
        delete entry.decision.partialResponses![agentId];
        this.event(entry, 'vote', `${agentId}: ${safe.vote}`, agentId);
      } catch (error) {
        const message = controller.signal.aborted ? '判定がキャンセルされました。' : error instanceof DecisionServiceError
          ? redactSecrets(error.message, secrets) : 'ノードの実行に失敗しました。';
        entry.decision.failures![agentId] = message;
        this.event(entry, 'failure', message, agentId);
      }
    })).then(() => {
      const failed = Object.keys(entry.decision.failures!).length > 0;
      entry.decision.status = failed ? 'failed' : 'completed';
      entry.decision.verdict = failed ? 'review' : aggregateVerdict(entry.decision.votes);
      entry.decision.completedAt = new Date().toISOString();
      this.event(entry, failed ? 'failure' : 'verdict', failed ? '判定未完了：失敗したノードがあります。' : entry.decision.verdict);
      options?.signal?.removeEventListener('abort', abort);
    });
    return running;
  }
}
