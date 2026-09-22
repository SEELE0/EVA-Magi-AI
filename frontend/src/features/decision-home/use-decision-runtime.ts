/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useRef, useState } from 'react';
import { createDecisionService } from '../../services/create-decision-service';
import { loadAgentConfigs, saveAgentConfigs } from '../../storage/agent-config-store';
import type { AgentRuntimeConfig } from '../../domain/agent-config';

export function useDecisionRuntime() {
  const [configs, setConfigs] = useState(loadAgentConfigs);
  const [storageWarning, setStorageWarning] = useState(false);
  const latest = useRef(configs);
  const [service] = useState(() => createDecisionService(() => latest.current));
  function saveAgentConfig(config: AgentRuntimeConfig) {
    const next = { ...latest.current, [config.agentId]: { ...config } };
    latest.current = next;
    setConfigs(next);
    setStorageWarning(!saveAgentConfigs(next));
  }
  return { configs, service, saveAgentConfig, storageWarning };
}
