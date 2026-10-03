/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDecisionService } from './create-decision-service';
import { HttpDecisionService } from './http-decision-service';
import { MockDecisionService } from './mock-decision-service';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('main execution boundary', () => {
  it('uses the project backend by default and never substitutes a browser result on failure', async () => {
    vi.stubEnv('VITE_API_MODE', undefined); vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.invalid');
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => { throw new TypeError('offline'); }); vi.stubGlobal('fetch', fetch);
    const service = createDecisionService(); expect(service).toBeInstanceOf(HttpDecisionService);
    await expect(service.createDecision({ subject: 'original input', priority: 'normal' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://backend.example.invalid/v1/decisions');
  });
  it('keeps the original Mock only when explicitly selected for UI preview', () => {
    vi.stubEnv('VITE_API_MODE', 'mock'); expect(createDecisionService()).toBeInstanceOf(MockDecisionService);
    vi.stubEnv('VITE_API_MODE', 'remote'); expect(createDecisionService()).toBeInstanceOf(HttpDecisionService);
  });
});
