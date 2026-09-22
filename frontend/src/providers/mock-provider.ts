/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { AgentProvider, ProviderResult } from '../application/agent-provider';
import { waitFor } from '../application/abort';
import { AGENT_IDS, type DecisionRequest } from '../domain/decision';
import type { AgentRuntimeConfig } from '../domain/agent-config';

export class MockProvider implements AgentProvider {
  constructor(private readonly delayMs = 520) {}
  validate(): void {}

  async invoke(config: AgentRuntimeConfig, request: DecisionRequest, signal: AbortSignal): Promise<ProviderResult> {
    const index = AGENT_IDS.indexOf(config.agentId);
    await waitFor(this.delayMs * (index + 1), signal);
    const hint = request.simulationHint ?? (
      /\[reject\]|否決/i.test(request.subject) ? 'reject'
        : /\[review\]|保留|棄権/i.test(request.subject) ? 'review' : 'standard'
    );
    const votes = {
      standard: ['approve', 'approve', 'reject'],
      reject: ['reject', 'reject', 'approve'],
      review: ['approve', 'reject', 'abstain']
    } as const;
    const vote = votes[hint][index];
    return {
      vote,
      response: `【模拟输出 / MOCK】${config.agentId}\n\n【议题】${request.subject}\n\n【结论】${vote}\n\n【说明】这是固定场景的演示投票，未调用模型，也不构成对议题的实际分析。`
    };
  }
}
