/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDecisionService } from '../../services/create-decision-service';
import { loadSharedSettings, saveSharedSettings } from '../../storage/shared-settings-store';
import { resolveAgentConfigs, type AgentConfigSource, type SharedSettings } from '../../domain/shared-settings';
import { localizeDefaultAgentPrompts, type AgentRuntimeConfig } from '../../domain/agent-config';
import { normalizeLocale } from '../../i18n';

export function useDecisionRuntime() {
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN');
  const [settings, setSettings] = useState(loadSharedSettings);
  const [storageWarning, setStorageWarning] = useState(false);
  const latest = useRef(settings);
  const latestLocale = useRef(locale);
  latestLocale.current = locale;
  // 引用需保持稳定：configs 每次渲染重建会让依赖它的弹窗在每次状态刷新（如每秒时钟）时重置编辑内容。
  const configs = useMemo(
    () => localizeDefaultAgentPrompts(resolveAgentConfigs(settings), locale),
    [settings, locale]
  );
  const [service] = useState(() => createDecisionService(() => {
    const resolved = localizeDefaultAgentPrompts(resolveAgentConfigs(latest.current), latestLocale.current);
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
