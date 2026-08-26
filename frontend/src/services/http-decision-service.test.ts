/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpDecisionService } from './http-decision-service';

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HttpDecisionService', () => {
  it('maps network failures to retryable errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new HttpDecisionService('http://localhost:8000').getSystemStatus())
      .rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE', retryable: true });
  });

  it('maps an expired request to a retryable timeout error', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      })
    ));
    vi.stubGlobal('fetch', fetchMock);

    const request = new HttpDecisionService('http://localhost:8000', { timeoutMs: 20 }).getSystemStatus();
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT', retryable: true });
    await vi.advanceTimersByTimeAsync(20);

    await expectation;
  });

  it('maps caller cancellation separately from timeout', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      })
    ));
    vi.stubGlobal('fetch', fetchMock);

    const request = new HttpDecisionService('http://localhost:8000').getSystemStatus({ signal: controller.signal });
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_ABORTED', retryable: false });
    controller.abort();

    await expectation;
  });

  it('preserves non-retryable HTTP business errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ error: { code: 'INVALID_REQUEST', message: 'bad request' } }, 422));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new HttpDecisionService('http://localhost:8000').getSystemStatus())
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', status: 422, retryable: false, message: 'bad request' });
  });

  it('rejects a successful response that does not match the endpoint shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ systemName: 'MAGI' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new HttpDecisionService('http://localhost:8000').getSystemStatus())
      .rejects.toMatchObject({ code: 'INVALID_RESPONSE', retryable: false });
  });
});
