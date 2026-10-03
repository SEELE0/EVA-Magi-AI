/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { AgentRuntimeConfig } from '../../domain/agent-config';
import { DecisionServiceError } from '../../services/decision-service';

/** Form validation only. Provider invocation belongs to the backend. */
export function validateAgentConfig(config: AgentRuntimeConfig): void {
  if (config.connection === 'mock') return;
  let url: URL;
  try { url = new URL(config.baseUrl.trim()); } catch {
    throw new DecisionServiceError('请填写有效的服务地址。', 'AGENT_CONFIG_INVALID');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
    || config.baseUrl.length > 500 || !config.model.trim() || config.model.length > 200
    || !config.prompt.trim() || config.prompt.length > 12000 || /[\r\n]/.test(config.apiKey)
    || config.apiKey.length > 4096) {
    throw new DecisionServiceError('请检查配置字段。', 'AGENT_CONFIG_INVALID');
  }
}
