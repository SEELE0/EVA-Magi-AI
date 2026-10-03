/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_IDS, type AgentId } from '../../domain/decision';
import { agentDisplayName, type AgentConfigMap } from '../../domain/agent-config';
import { ChatCompletionsProvider, validateAgentConfig } from '../../providers/chat-completions-provider';
import { localizeError } from '../../i18n-error';

function sameConnections(left: AgentConfigMap, right: AgentConfigMap) {
  const fields = ['connection', 'baseUrl', 'model', 'apiKey'] as const;
  return AGENT_IDS.every(id => fields.every(field => left[id][field] === right[id][field]));
}

interface ConnectionCheck {
  configs: AgentConfigMap;
  failures: { id: AgentId; cause: unknown }[];
}

export function NodeConnectionStatus({ configs, protocol, startupFailed = false }: {
  configs: AgentConfigMap;
  protocol: string;
  startupFailed?: boolean;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<ConnectionCheck | null>(null);
  const [testing, setTesting] = useState(false);
  const activeCheck = useRef<{ configs: AgentConfigMap; controller: AbortController } | null>(null);

  useEffect(() => {
    const active = activeCheck.current;
    if (active && !sameConnections(active.configs, configs)) {
      active.controller.abort();
      activeCheck.current = null;
      setTesting(false);
    }
  }, [configs]);

  useEffect(() => () => {
    activeCheck.current?.controller.abort();
    activeCheck.current = null;
  }, []);

  async function checkConnections() {
    if (activeCheck.current) return;
    const check = { configs, controller: new AbortController() };
    activeCheck.current = check;
    setTesting(true);
    const provider = new ChatCompletionsProvider(15_000);
    const outcomes = await Promise.allSettled(AGENT_IDS.map(async id => {
      const config = check.configs[id];
      // 模拟节点只检查本地配置；不把模拟检查冒充真实 API 接入。
      if (config.connection === 'mock') validateAgentConfig(config);
      else await provider.testConnection(config, check.controller.signal);
    }));
    if (activeCheck.current !== check || check.controller.signal.aborted) return;
    const failures = outcomes.flatMap((outcome, index) => outcome.status === 'rejected'
      ? [{ id: AGENT_IDS[index], cause: outcome.reason }] : []);
    setResult({ configs: check.configs, failures });
    activeCheck.current = null;
    setTesting(false);
  }

  const currentResult = result && sameConnections(result.configs, configs) ? result : null;
  const state = currentResult ? (currentResult.failures.length ? 'timeout' : 'normal')
    : startupFailed ? 'timeout' : 'normal';
  const label = t(`connectivity.${state}`);
  const simulated = AGENT_IDS.every(id => configs[id].connection === 'mock');
  const hint = testing ? t('settings.testing') : [
    currentResult ? t('connectivity.test') : t('connectivity.unchecked'),
    simulated ? t('connectivity.simulated') : '',
    ...(currentResult?.failures.map(({ id, cause }) => `${agentDisplayName(configs[id], id)}: ${localizeError(cause, t)}`) ?? [])
  ].filter(Boolean).join('\n');

  return <button type="button" className="magi-home__system-status"
    data-connection={state === 'normal' ? 'online' : 'offline'}
    aria-label={`${t('connectivity.test')} · ${label}`} aria-live="polite"
    aria-busy={testing} aria-disabled={testing} title={hint} onClick={() => { void checkConnections(); }}>
    <span aria-hidden="true" />
    <strong>{label}</strong>
    <small>{protocol}</small>
  </button>;
}
