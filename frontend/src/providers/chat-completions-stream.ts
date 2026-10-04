/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { throwIfAborted } from '../application/abort';
import { DecisionServiceError } from '../application/decision-service';

const MAX_STREAM_BYTES = 2_000_000;
const MAX_CONTENT_LENGTH = 256_000;

function invalidStream() {
  return new DecisionServiceError('模型未返回有效的 JSON 投票和答复，请检查模型及角色 Prompt。', 'INVALID_AGENT_RESULT');
}

function readString(text: string, start: number, partial = false): { value: string; end: number } | undefined {
  if (text[start] !== '"') return;
  let value = '';
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index];
    if (character === '"') return { value, end: index + 1 };
    if (character.charCodeAt(0) < 32) return;
    if (character !== '\\') { value += character; continue; }
    const escape = text[++index];
    if (escape === undefined) break;
    if (escape === 'u') {
      const hex = text.slice(index + 1, index + 5);
      if (hex.length < 4) break;
      if (!/^[\da-f]{4}$/i.test(hex)) return;
      value += String.fromCharCode(parseInt(hex, 16));
      index += 4;
    } else {
      const escaped: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      if (!(escape in escaped)) return;
      value += escaped[escape];
    }
  }
  // Do not display a half-decoded surrogate while its second half is still arriving.
  if (partial) return { value: value.replace(/[\uD800-\uDBFF]$/, ''), end: text.length };
}

/** Extract only a top-level reason string from unfinished JSON, never raw JSON or hidden reasoning. */
export function previewVoteReason(content: string): string | undefined {
  const text = content.trimStart().replace(/^```json\s*/i, '');
  if (text[0] !== '{') return;
  let index = 1;
  const whitespace = () => { while (/\s/.test(text[index] ?? '') && index < text.length) index++; };
  while (index < text.length) {
    whitespace();
    const key = readString(text, index);
    if (!key) return;
    index = key.end;
    whitespace();
    if (text[index++] !== ':') return;
    whitespace();
    if (key.value === 'reason') return readString(text, index, true)?.value;
    // Skip other values, respecting nested objects and escaped strings.
    let depth = 0;
    for (; index < text.length; index++) {
      const character = text[index];
      if (character === '"') {
        const string = readString(text, index);
        if (!string) return;
        index = string.end - 1;
      } else if (character === '{' || character === '[') depth++;
      else if (character === '}' || character === ']') {
        if (depth === 0) return;
        depth--;
      } else if (character === ',' && depth === 0) { index++; break; }
    }
  }
}

/** SSE framing is independent of network chunks, UTF-8 boundaries and JSON-token boundaries. */
export async function readChatCompletionStream(response: Response, signal: AbortSignal,
  onProgress?: (response: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw invalidStream();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let size = 0;
  let done = false;
  let finished = false;
  let previous: string | undefined;
  let previewAt = 0;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', cancel, { once: true });

  function publishPreview(force = false) {
    // Coalesce fast token bursts; the UI polls at 220ms, so parsing each token adds needless work.
    const now = Date.now();
    if (!onProgress || (!force && previous !== undefined && now - previewAt < 50)) return;
    const preview = previewVoteReason(content);
    if (preview !== undefined && preview !== previous) {
      previous = preview;
      previewAt = now;
      onProgress(preview);
    }
  }

  function consume(frame: string) {
    const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, '')).join('\n');
    if (!data) return;
    if (data.trim() === '[DONE]') { done = true; return; }
    let payload: { error?: unknown; choices?: { index?: number; delta?: { content?: unknown }; finish_reason?: string | null }[] };
    try { payload = JSON.parse(data); } catch { throw invalidStream(); }
    if (!payload || typeof payload !== 'object' || payload.error || !Array.isArray(payload.choices)) throw invalidStream();
    const choice = payload.choices.find(item => item && typeof item === 'object' && (item.index === 0 || item.index === undefined));
    if (!choice) return; // Usage-only final chunks and keepalive events do not contain text.
    if (choice.finish_reason && choice.finish_reason !== 'stop') throw invalidStream();
    if (choice.finish_reason === 'stop') finished = true;
    const delta = choice.delta?.content;
    if (delta === undefined || delta === null) return;
    if (typeof delta !== 'string') throw invalidStream();
    content += delta;
    if (content.length > MAX_CONTENT_LENGTH) throw new DecisionServiceError('模型响应超过允许大小。', 'AGENT_RESPONSE_TOO_LARGE');
    publishPreview();
  }

  function drain(final = false) {
    let match: RegExpExecArray | null;
    while (!done && (match = /\r?\n\r?\n/.exec(buffer))) {
      const frame = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      consume(frame);
    }
    if (final && !done && buffer.trim()) { consume(buffer); buffer = ''; }
  }

  try {
    throwIfAborted(signal);
    while (!done) {
      const chunk = await reader.read();
      throwIfAborted(signal);
      if (chunk.done) { buffer += decoder.decode(); drain(true); break; }
      size += chunk.value.byteLength;
      if (size > MAX_STREAM_BYTES) throw new DecisionServiceError('模型响应超过允许大小。', 'AGENT_RESPONSE_TOO_LARGE');
      buffer += decoder.decode(chunk.value, { stream: true });
      drain();
    }
    if ((!done && !finished) || !content.trim()) throw invalidStream();
    publishPreview(true);
    return content;
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
