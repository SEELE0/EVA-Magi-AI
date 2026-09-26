/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useRef, useState } from 'react';
import { createDecisionService } from '../../services/create-decision-service';
import { loadSharedSettings, saveSharedSettings } from '../../storage/shared-settings-store';
import { resolveAgentConfigs, type AgentConfigSource, type SharedSettings } from '../../domain/shared-settings';
import type { AgentRuntimeConfig } from '../../domain/agent-config';

export function useDecisionRuntime() {
  const [settings, setSettings] = useState(loadSharedSettings);
  const [storageWarning, setStorageWarning] = useState(false);
  const latest = useRef(settings);
  const configs = resolveAgentConfigs(settings);
  const [service] = useState(() => createDecisionService(() => {
    const resolved = resolveAgentConfigs(latest.current);
    for (const config of Object.values(resolved)) config.sharedBackground = latest.current.background;
    return resolved;
  }));
  function saveSettings(next: SharedSettings) {
    latest.current = next;
    setSettings(next);
    setStorageWarning(!saveSharedSettings(next));
  }
  function saveAgentConfig(config: AgentRuntimeConfig, source: AgentConfigSource = config.agentId) {
    const current = latest.current;
    saveSettings({ ...current, nodes: { ...current.nodes, [config.agentId]: { ...config } },
      sources: { ...current.sources, [config.agentId]: source } });
  }
  function saveGlobalConfig(global: AgentRuntimeConfig) {
    saveSettings({ ...latest.current, global: { ...global } });
  }
  function saveSettingBook(background: string) {
    saveSettings({ ...latest.current, background });
  }
  return { configs, settings, service, saveAgentConfig, saveGlobalConfig, saveSettingBook, storageWarning };
}
