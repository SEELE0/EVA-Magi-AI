/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDecisionService } from './create-decision-service';
import { HttpDecisionService } from './http-decision-service';
import { MockDecisionService } from './mock-decision-service';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('main execution boundary', () => {
  it.each([undefined, 'mock'])('completes a local preview without backend requests in mode %s', async (mode) => {
    vi.stubEnv('VITE_API_MODE', mode);
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.invalid');
    vi.useFakeTimers();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const service = createDecisionService();
    expect(service).toBeInstanceOf(MockDecisionService);
    expect((await service.getSystemStatus()).source).toBe('mock');
    const draft = await service.createDecision({ subject: 'original input', priority: 'normal' });
    const execution = service.executeDecision(draft.id);
    await vi.runAllTimersAsync();
    expect(await execution).toMatchObject({ subject: 'original input', status: 'completed', verdict: 'approved' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the explicitly selected backend and never substitutes a local result on failure', async () => {
    vi.stubEnv('VITE_API_MODE', 'remote');
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.invalid');
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => { throw new TypeError('offline'); });
    vi.stubGlobal('fetch', fetch);
    const service = createDecisionService();
    expect(service).toBeInstanceOf(HttpDecisionService);
    await expect(service.createDecision({ subject: 'original input', priority: 'normal' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://backend.example.invalid/v1/decisions');
  });
});
