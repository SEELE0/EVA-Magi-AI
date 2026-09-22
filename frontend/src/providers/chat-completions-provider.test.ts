/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatCompletionsProvider, parseAgentVote, toChatCompletionsUrl } from './chat-completions-provider';
import { cloneAgentConfigs } from '../domain/agent-config';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const config = { ...cloneAgentConfigs()['MELCHIOR-1'], connection: 'openai-compatible' as const,
  baseUrl: 'https://example.com/v1', model: 'test-model', apiKey: 'test-secret' };
const request = { subject: 'test', priority: 'normal' as const };
describe('strict chat completions adapter', () => {
  it.each(['I do not approve this', '否决', '{"vote":"approve"}', '{"vote":"拒绝","reason":"no"}', '{"vote":"approve","reason":""}'])('rejects ambiguous result %s', text => {
    expect(() => parseAgentVote(text)).toThrow();
  });
  it('accepts exact votes, fenced JSON and long reasons', () => {
    expect(parseAgentVote('```json\n{"vote":"abstain","reason":"uncertain"}\n```').vote).toBe('abstain');
    expect(parseAgentVote(JSON.stringify({ vote: 'reject', reason: 'x'.repeat(8000) })).response).toHaveLength(8000);
  });
  it.each(['http://example.com', 'https://user:pass@example.com', 'https://example.com?key=secret', 'https://example.com/#key'])('rejects unsafe endpoint %s', url => {
    expect(() => toChatCompletionsUrl(url)).toThrow();
  });
  it('supports origin, version prefix, complete endpoint and local development', () => {
    expect(toChatCompletionsUrl('https://example.com')).toBe('https://example.com/v1/chat/completions');
    expect(toChatCompletionsUrl('https://example.com/v1/chat/completions/')).toBe('https://example.com/v1/chat/completions');
    expect(toChatCompletionsUrl('http://localhost:1234/v1')).toBe('http://localhost:1234/v1/chat/completions');
  });
  it('does not expose HTTP error bodies containing keys', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('test-secret raw error', { status: 401 })));
    await expect(new ChatCompletionsProvider().invoke(config, request, new AbortController().signal)).rejects.toMatchObject({ code: 'AGENT_HTTP_ERROR', status: 401 });
  });
  it('does not send a pre-canceled request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const controller = new AbortController(); controller.abort();
    await expect(new ChatCompletionsProvider().invoke(config, request, controller.signal)).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends the key only in authorization and parses the response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"vote":"reject","reason":"actual response"}' } }] })));
    vi.stubGlobal('fetch', fetch);
    expect(await new ChatCompletionsProvider().invoke(config, request, new AbortController().signal)).toEqual({ vote: 'reject', response: 'actual response' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).not.toContain(config.apiKey);
    expect(init.body).not.toContain(config.apiKey);
    expect(init.headers.Authorization).toBe('Bearer test-secret');
    expect(init.redirect).toBe('error');
  });
  it('times out stalled requests without retaining timers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    const promise = new ChatCompletionsProvider(10).invoke(config, request, new AbortController().signal);
    const assertion = expect(promise).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(11); await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
