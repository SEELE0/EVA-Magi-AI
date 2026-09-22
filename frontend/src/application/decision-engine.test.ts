/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DecisionEngine } from './decision-engine';
import { cloneAgentConfigs } from '../domain/agent-config';
import { MockProvider } from '../providers/mock-provider';
import type { AgentProvider } from './agent-provider';
import { DecisionServiceError } from './decision-service';

afterEach(() => vi.useRealTimers());
const request = { subject: 'test motion', priority: 'normal' as const };
function setup(provider: AgentProvider) {
  const configs = cloneAgentConfigs();
  const engine = new DecisionEngine(() => configs, { mock: provider, 'openai-compatible': provider, 'local-compatible': provider });
  return { configs, engine };
}
describe('browser decision lifecycle', () => {
  it('runs nodes concurrently, exposes partial votes and executes only once', async () => {
    vi.useFakeTimers();
    const provider = new MockProvider(100);
    const invoke = vi.spyOn(provider, 'invoke');
    const { engine } = setup(provider);
    const created = await engine.createDecision(request);
    expect((await engine.executeDecision(created.id)).status).toBe('running');
    expect(invoke).toHaveBeenCalledTimes(3);
    await engine.executeDecision(created.id);
    await vi.advanceTimersByTimeAsync(110);
    expect((await engine.getDecision(created.id)).votes).toEqual({ 'MELCHIOR-1': 'approve', 'BALTHASAR-2': 'pending', 'CASPER-3': 'pending' });
    await vi.runAllTimersAsync();
    expect((await engine.executeDecision(created.id)).verdict).toBe('approved');
    expect(invoke).toHaveBeenCalledTimes(3);
  });
  it('never converts two failures to abstentions or a successful verdict', async () => {
    const { engine } = setup({ validate() {}, async invoke(config) {
      if (config.agentId !== 'MELCHIOR-1') throw new Error('raw upstream body');
      return { vote: 'approve', response: 'valid result' };
    } });
    const created = await engine.createDecision(request);
    await engine.executeDecision(created.id);
    await vi.waitFor(async () => expect((await engine.getDecision(created.id)).status).toBe('failed'));
    const result = await engine.getDecision(created.id);
    expect(result.verdict).toBe('review');
    expect(result.votes['BALTHASAR-2']).toBe('pending');
    expect(result.outputs?.['MELCHIOR-1']?.response).toBe('valid result');
    expect(JSON.stringify(result)).not.toContain('raw upstream body');
  });
  it('cancels timers and reaches a failed terminal state', async () => {
    vi.useFakeTimers();
    const { engine } = setup(new MockProvider(100));
    const controller = new AbortController();
    const created = await engine.createDecision(request);
    await engine.executeDecision(created.id, { signal: controller.signal });
    controller.abort();
    await vi.runAllTimersAsync();
    expect((await engine.getDecision(created.id)).status).toBe('failed');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('validates all nodes before making any calls', async () => {
    const invoke = vi.fn();
    const { engine } = setup({ invoke, validate(config) {
      if (config.agentId === 'CASPER-3') throw new DecisionServiceError('invalid config');
    } });
    const created = await engine.createDecision(request);
    await expect(engine.executeDecision(created.id)).rejects.toThrow('invalid config');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('snapshots configuration, returns copies and redacts credentials from output', async () => {
    vi.useFakeTimers();
    const provider = new MockProvider(10);
    const { engine, configs } = setup(provider);
    configs['MELCHIOR-1'].apiKey = 'secret-test-key';
    const created = await engine.createDecision({ ...request, subject: 'secret-test-key' });
    await engine.executeDecision(created.id);
    configs['MELCHIOR-1'].model = 'edited later';
    await vi.runAllTimersAsync();
    const result = await engine.getDecision(created.id);
    expect(JSON.stringify(result)).not.toContain('secret-test-key');
    expect(result.outputs?.['MELCHIOR-1']?.model).not.toBe('edited later');
    result.votes['MELCHIOR-1'] = 'reject';
    expect((await engine.getDecision(created.id)).votes['MELCHIOR-1']).toBe('approve');
  });
});
