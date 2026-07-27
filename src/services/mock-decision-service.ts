import {
  AGENT_IDS,
  type Agent,
  type AgentId,
  type Decision,
  type DecisionEvent,
  type DecisionRequest,
  type SystemStatus,
  type Vote
} from '../domain';
import type { DecisionService } from './decision-service';

const wait = (milliseconds: number) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

const pendingVotes = (): Record<AgentId, Vote> => ({
  'MELCHIOR-1': 'pending',
  'BALTHASAR-2': 'pending',
  'CASPER-3': 'pending'
});

const agentBlueprints: Omit<Agent, 'vote'>[] = [
  { id: 'MELCHIOR-1', role: '科学者論理', health: 'nominal', latencyMs: 18 },
  { id: 'BALTHASAR-2', role: '母性論理', health: 'nominal', latencyMs: 24 },
  { id: 'CASPER-3', role: '女性論理', health: 'nominal', latencyMs: 21 }
];

export class MockDecisionService implements DecisionService {
  private readonly decisions = new Map<string, Decision>();
  private readonly eventLog = new Map<string, DecisionEvent[]>();

  async getSystemStatus(): Promise<SystemStatus> {
    return {
      systemName: 'MAGI 判定システム',
      connection: 'online',
      source: 'mock',
      protocol: 'MAGI/3.0 ローカル模擬機',
      uptimeSeconds: Math.floor(performance.now() / 1000),
      updatedAt: new Date().toISOString(),
      notice: 'ローカル判定エミュレータ稼働中'
    };
  }

  async getAgents(): Promise<Agent[]> {
    return agentBlueprints.map((agent) => ({ ...agent, vote: 'pending' }));
  }

  async createDecision(request: DecisionRequest): Promise<Decision> {
    const now = new Date().toISOString();
    const id = `dec-${crypto.randomUUID().slice(0, 8)}`;
    const decision: Decision = {
      id,
      subject: request.subject.trim(),
      priority: request.priority,
      status: 'draft',
      verdict: 'pending',
      votes: pendingVotes(),
      createdAt: now
    };
    this.decisions.set(id, decision);
    this.eventLog.set(id, [this.event(id, 'created', '判定パケットを受理')]);
    return this.cloneDecision(decision);
  }

  async getDecision(decisionId: string): Promise<Decision> {
    return this.cloneDecision(this.mustFind(decisionId));
  }

  async executeDecision(decisionId: string): Promise<Decision> {
    const decision = this.mustFind(decisionId);
    if (decision.status === 'running') return this.cloneDecision(decision);

    decision.status = 'running';
    this.pushEvent(decisionId, this.event(decisionId, 'scan', '三人格による合議を開始'));

    const sequence = this.voteSequence(decision.subject);
    for (const [index, agentId] of AGENT_IDS.entries()) {
      await wait(520);
      const vote = sequence[index];
      decision.votes[agentId] = vote;
      this.pushEvent(decisionId, this.event(decisionId, 'vote', `${agentId} ：${this.voteLabel(vote)}`, agentId));
    }

    const approved = Object.values(decision.votes).filter((vote) => vote === 'approve').length;
    const rejected = Object.values(decision.votes).filter((vote) => vote === 'reject').length;
    decision.verdict = approved > rejected ? 'approved' : rejected > approved ? 'rejected' : 'review';
    decision.status = 'completed';
    decision.completedAt = new Date().toISOString();
    this.pushEvent(
      decisionId,
      this.event(decisionId, 'verdict', `最終判定：${this.verdictLabel(decision.verdict)}`)
    );
    return this.cloneDecision(decision);
  }

  async getEvents(decisionId: string): Promise<DecisionEvent[]> {
    this.mustFind(decisionId);
    return [...(this.eventLog.get(decisionId) ?? [])];
  }

  private voteSequence(subject: string): [Vote, Vote, Vote] {
    const normalized = subject.toLowerCase();
    if (normalized.includes('[reject]') || normalized.includes('否決')) {
      return ['reject', 'reject', 'approve'];
    }
    if (normalized.includes('[review]') || normalized.includes('保留') || normalized.includes('棄権')) {
      return ['approve', 'reject', 'abstain'];
    }
    return ['approve', 'approve', 'reject'];
  }

  private mustFind(id: string): Decision {
    const decision = this.decisions.get(id);
    if (!decision) throw new Error(`Decision ${id} was not found.`);
    return decision;
  }

  private event(id: string, kind: DecisionEvent['kind'], message: string, agentId?: AgentId): DecisionEvent {
    return {
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      decisionId: id,
      kind,
      message,
      agentId,
      timestamp: new Date().toISOString()
    };
  }

  private pushEvent(id: string, event: DecisionEvent) {
    this.eventLog.set(id, [...(this.eventLog.get(id) ?? []), event]);
  }

  private voteLabel(vote: Vote): string {
    return { approve: '承認', reject: '否決', abstain: '棄権', pending: '待機' }[vote];
  }

  private verdictLabel(verdict: Decision['verdict']): string {
    return { approved: '承認', rejected: '否決', review: '要再審', pending: '待機' }[verdict];
  }

  private cloneDecision(decision: Decision): Decision {
    return { ...decision, votes: { ...decision.votes } };
  }
}
