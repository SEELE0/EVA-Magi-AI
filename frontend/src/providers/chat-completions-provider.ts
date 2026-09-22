/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { AgentProvider, ProviderResult } from '../application/agent-provider';
import { DecisionServiceError } from '../application/decision-service';
import { throwIfAborted } from '../application/abort';
import type { AgentRuntimeConfig } from '../domain/agent-config';
import type { DecisionRequest } from '../domain/decision';

export const MAX_REASON_LENGTH = 32_000;
const MAX_BODY_BYTES = 256_000;

function invalidResult(): DecisionServiceError {
  return new DecisionServiceError('模型未返回有效的 JSON 投票和答复，请检查模型及角色 Prompt。', 'INVALID_AGENT_RESULT');
}

export function parseAgentVote(content: string): ProviderResult {
  // Accept a single fenced JSON object, but never guess from words in free text.
  const text = content.trim().replace(/^```json\s*([\s\S]*?)\s*```$/i, '$1');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw invalidResult(); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidResult();
  const { vote, reason } = value as Record<string, unknown>;
  if ((vote !== 'approve' && vote !== 'reject' && vote !== 'abstain')
    || typeof reason !== 'string' || !reason.trim() || reason.length > MAX_REASON_LENGTH) throw invalidResult();
  return { vote, response: reason.trim() };
}

export function toChatCompletionsUrl(baseUrl: string): string {
  let url: URL;
  try { url = new URL(baseUrl.trim()); } catch {
    throw new DecisionServiceError('请填写有效的 API BASE URL。', 'AGENT_CONFIG_INVALID');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    || url.username || url.password || url.search || url.hash) {
    throw new DecisionServiceError('API 地址须使用 HTTPS，本机 localhost 可使用 HTTP；地址不能包含账号、查询参数或片段。', 'AGENT_CONFIG_INVALID');
  }
  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname.endsWith('/chat/completions') ? pathname
    : `${pathname || '/v1'}/chat/completions`;
  return url.href;
}

export function validateAgentConfig(config: AgentRuntimeConfig): void {
  if (config.connection === 'mock') return;
  if (config.baseUrl.trim().length > 500) {
    throw new DecisionServiceError('API BASE URL 不能超过 500 个字符。', 'AGENT_CONFIG_INVALID');
  }
  toChatCompletionsUrl(config.baseUrl);
  if (!config.model.trim() || config.model.length > 200 || !config.prompt.trim() || config.prompt.length > 12_000) {
    throw new DecisionServiceError('请填写 MODEL 和角色 Prompt（分别不超过 200、12000 字符）。', 'AGENT_CONFIG_INVALID');
  }
  if (/[\r\n]/.test(config.apiKey) || config.apiKey.length > 4096) {
    throw new DecisionServiceError('API Key 格式不正确。', 'AGENT_CONFIG_INVALID');
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw invalidResult();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new DecisionServiceError('模型响应超过允许大小。', 'AGENT_RESPONSE_TOO_LARGE');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text); } catch { throw invalidResult(); }
}

export class ChatCompletionsProvider implements AgentProvider {
  constructor(private readonly timeoutMs = 90_000) {}
  validate = validateAgentConfig;

  async invoke(config: AgentRuntimeConfig, request: DecisionRequest, signal: AbortSignal): Promise<ProviderResult> {
    throwIfAborted(signal);
    this.validate(config);
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    signal.addEventListener('abort', forwardAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(toChatCompletionsUrl(config.baseUrl), {
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(config.apiKey.trim()
          ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}) },
        body: JSON.stringify({
          model: config.model.trim(),
          stream: false,
          messages: [
            { role: 'system', content: `${config.prompt.trim()}\n\n只返回一个 JSON 对象：{"vote":"approve|reject|abstain","reason":"面向用户的结论、理由、风险和建议"}。vote 必须是其中一个英文枚举。reason 使用议题的语言，不输出隐藏思考过程。` },
            { role: 'user', content: `议题：${request.subject}\n优先级：${request.priority}` }
          ]
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        // Provider error bodies can echo credentials. Never read or store them.
        await response.body?.cancel();
        const hint = response.status === 401 || response.status === 403 ? '请检查 API Key 和权限。'
          : response.status === 429 ? '额度不足或请求过于频繁，请稍后重试。'
          : '请检查接口地址、模型名称和服务状态。';
        throw new DecisionServiceError(`模型请求失败：HTTP ${response.status}。${hint}`, 'AGENT_HTTP_ERROR', { status: response.status });
      }
      const payload = await readPayload(response) as { choices?: { message?: { content?: unknown } }[] } | null;
      const content = payload?.choices?.[0]?.message?.content;
      throwIfAborted(signal);
      if (controller.signal.aborted) throw new DecisionServiceError('模型响应超时，请稍后重新提交。', 'REQUEST_TIMEOUT');
      if (typeof content !== 'string') throw invalidResult();
      return parseAgentVote(content);
    } catch (error) {
      throwIfAborted(signal);
      if (controller.signal.aborted) throw new DecisionServiceError('模型响应超时，请稍后重新提交。', 'REQUEST_TIMEOUT');
      if (error instanceof DecisionServiceError) throw error;
      throw new DecisionServiceError('无法连接模型服务。请检查地址、网络及服务的 CORS 设置。', 'AGENT_NETWORK_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', forwardAbort);
    }
  }
}
