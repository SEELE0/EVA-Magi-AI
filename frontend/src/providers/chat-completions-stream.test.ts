/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloneAgentConfigs } from '../domain/agent-config';
import { ChatCompletionsProvider } from './chat-completions-provider';
import { previewVoteReason } from './chat-completions-stream';

const config = { ...cloneAgentConfigs()['MELCHIOR-1'], connection: 'openai-compatible' as const,
  baseUrl: 'https://example.invalid/v1', model: 'test-model', apiKey: 'fixture-key' };
const request = { subject: '原文 / subject', priority: 'normal' as const };
const encoder = new TextEncoder();
function delta(content: string) { return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\r\n\r\n`; }
const finish = 'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\r\n\r\n';
function responseFrom(text: string, chunkSize = 13) {
  const bytes = encoder.encode(text);
  return new Response(new ReadableStream({ start(controller) {
    for (let index = 0; index < bytes.length; index += chunkSize) controller.enqueue(bytes.slice(index, index + chunkSize));
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('streamed structured votes', () => {
  it('decodes incomplete escaped reason strings without exposing other JSON fields', () => {
    expect(previewVoteReason('{"vote":"reject","reason":"第一行\\n引用\\"内容\\"\\u4e')).toBe('第一行\n引用"内容"');
    expect(previewVoteReason('```json\n{"nested":{"reason":"not the answer"},"reason":"answer')).toBe('answer');
    expect(previewVoteReason('{"reason":"emoji \\uD83D')).toBe('emoji ');
    expect(previewVoteReason('{"reason":"emoji \\uD83D\\uDE00')).toBe('emoji 😀');
    expect(previewVoteReason('{"vote":"approve')).toBeUndefined();
  });

  it('emits previews before completion and validates the final vote once', async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const response = new Response(new ReadableStream({ start(controller) { stream = controller; } }), { headers: { 'Content-Type': 'text/event-stream' } });
    const fetch = vi.fn().mockResolvedValue(response); vi.stubGlobal('fetch', fetch);
    const progress = vi.fn();
    let settled = false;
    const promise = new ChatCompletionsProvider().invoke(config, request, new AbortController().signal, progress)
      .finally(() => { settled = true; });
    stream.enqueue(encoder.encode(delta('{"vote":"approve","reason":"前半部分')));
    await vi.waitFor(() => expect(progress).toHaveBeenCalledWith('前半部分'));
    expect(settled).toBe(false);
    expect(JSON.parse(fetch.mock.calls[0][1].body).stream).toBe(true);
    stream.enqueue(encoder.encode(delta('，后半部分"}') + finish + 'data: [DONE]\n\n'));
    expect(await promise).toEqual({ vote: 'approve', response: '前半部分，后半部分' });
    expect(progress).toHaveBeenLastCalledWith('前半部分，后半部分');
  });

  it.each([1, 17])('handles UTF-8, SSE and JSON boundaries split into %s-byte chunks', async size => {
    const reason = '中文 / 日本語 / 😀\nquoted "text" and \\ slash';
    const content = JSON.stringify({ vote: 'abstain', reason });
    const events = ': heartbeat\r\n\r\n' +
      'data: {"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"hidden private reasoning"}}]}\r\n\r\n' +
      Array.from(content).map(character => delta(character)).join('') + finish +
      'data: {"choices":[],"usage":{"completion_tokens":20}}\r\n\r\ndata: [DONE]\r\n\r\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFrom(events, size)));
    const progress = vi.fn();
    expect(await new ChatCompletionsProvider().invoke(config, request, new AbortController().signal, progress))
      .toEqual({ vote: 'abstain', response: reason });
    expect(progress).toHaveBeenLastCalledWith(reason);
    expect(JSON.stringify(progress.mock.calls)).not.toContain('hidden private reasoning');
    expect(JSON.stringify(progress.mock.calls)).not.toContain('"vote":');
  });

  it.each([
    delta('{"vote":"approve","reason":"complete JSON without a finish event"}'),
    delta('{"vote":"approve","reason":"unfinished') + 'data: [DONE]\n\n',
    delta('{"vote":"approve","reason":"truncated"}') + 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
    'data: {"error":{"message":"fixture-key must not be surfaced"}}\n\n'
  ])('rejects a broken or truncated stream instead of approving a partial vote', async events => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFrom(events)));
    await expect(new ChatCompletionsProvider().invoke(config, request, new AbortController().signal))
      .rejects.toMatchObject({ code: 'INVALID_AGENT_RESULT' });
  });

  it('still accepts a non-streaming JSON response without retrying the model request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"vote":"reject","reason":"full response"}' } }] }),
      { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    expect(await new ChatCompletionsProvider().invoke(config, request, new AbortController().signal))
      .toEqual({ vote: 'reject', response: 'full response' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(['cancel', 'timeout'])('releases a stalled stream on %s without retaining timers', async mode => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { 'Content-Type': 'text/event-stream' } })));
    const controller = new AbortController();
    const promise = new ChatCompletionsProvider(10).invoke(config, request, controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({ code: mode === 'cancel' ? 'REQUEST_ABORTED' : 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(0);
    if (mode === 'cancel') controller.abort();
    else await vi.advanceTimersByTimeAsync(11);
    await assertion;
    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a stream even when no complete event has arrived', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFrom('x'.repeat(2_000_001), 2_000_001)));
    await expect(new ChatCompletionsProvider().invoke(config, request, new AbortController().signal))
      .rejects.toMatchObject({ code: 'AGENT_RESPONSE_TOO_LARGE' });
  });
});
