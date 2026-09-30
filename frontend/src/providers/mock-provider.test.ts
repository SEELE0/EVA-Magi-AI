/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest';
import { cloneAgentConfigs } from '../domain/agent-config';
import { MockProvider } from './mock-provider';

describe('MockProvider', () => {
  it('randomizes votes independently of scenario wording', async () => {
    const config = cloneAgentConfigs()['MELCHIOR-1'];
    const expectedVotes = ['approve', 'reject', 'abstain'] as const;
    const randomValues = [0.01, 0.5, 0.99];

    for (let index = 0; index < randomValues.length; index += 1) {
      const provider = new MockProvider(0, () => randomValues[index]);
      const result = await provider.invoke(
        config,
        { subject: '【否决】未承认的外部连接申请', priority: 'normal' },
        new AbortController().signal
      );

      expect(result.vote).toBe(expectedVotes[index]);
      expect(result.response).toContain('随机生成的模拟投票');
    }
  });
});
