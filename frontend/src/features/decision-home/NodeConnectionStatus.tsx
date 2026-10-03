/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentConfigMap } from '../../domain/agent-config';
import type { DecisionService } from '../../services/decision-service';
import { localizeError } from '../../i18n-error';

type HealthService = Pick<DecisionService, 'getSystemStatus' | 'getAgents'>;

export function NodeConnectionStatus({ configs, service, protocol, startupFailed = false }: {
  configs: AgentConfigMap;
  service: HealthService;
  protocol: string;
  startupFailed?: boolean;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<{ service: HealthService; normal: boolean; simulated: boolean; cause?: unknown } | null>(null);
  const [testing, setTesting] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, [service]);

  async function checkConnection() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setTesting(true);
    try {
      const [status, agents] = await Promise.all([
        service.getSystemStatus({ signal: controller.signal }), service.getAgents({ signal: controller.signal })
      ]);
      if (active.current !== controller) return;
      setResult({ service, normal: status.connection === 'online' && agents.every(agent => agent.health !== 'offline'), simulated: status.source === 'mock' });
    } catch (cause) {
      if (active.current === controller) setResult({ service, normal: false, simulated: false, cause });
    } finally {
      if (active.current === controller) { active.current = null; setTesting(false); }
    }
  }

  const current = result?.service === service ? result : null;
  const state = current ? (current.normal ? 'normal' : 'timeout') : startupFailed ? 'timeout' : 'normal';
  const hint = testing ? t('settings.testing') : [t('settings.testHelp'),
    current?.simulated ? t('connectivity.simulated') : '', current?.cause ? localizeError(current.cause, t) : ''
  ].filter(Boolean).join('\n');
  // Configs remain presentation metadata. They are never used to call model URLs.
  const label = t(`connectivity.${state}`);
  return <button type="button" className="magi-home__system-status" data-connection={state === 'normal' ? 'online' : 'offline'}
    data-node-count={Object.keys(configs).length} aria-label={`${t('connectivity.test')} · ${label}`} aria-live="polite"
    aria-busy={testing} aria-disabled={testing} title={hint} onClick={() => { void checkConnection(); }}>
    <span aria-hidden="true" /><strong>{label}</strong><small>{protocol}</small>
  </button>;
}
