/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { AgentId } from '../../domain/decision';
import { getAgentConnectionConfig, prepareNodeConfig, resolveAgentConfigs } from '../../domain/shared-settings';
import { AgentConfigDialog } from './AgentConfigDialog';
import { SettingBookDialog } from './SettingBookDialog';
import type { useDecisionRuntime } from './use-decision-runtime';

type Runtime = ReturnType<typeof useDecisionRuntime>;
type SettingsView = 'overall' | 'book' | null;

export function RuntimeSettings({ runtime, selectedAgentId, onCloseNode, variant = 'modern', onSaved, renderEntry }: {
  runtime: Runtime;
  selectedAgentId: AgentId | null;
  onCloseNode: () => void;
  variant?: 'modern' | 'original';
  onSaved?: () => void;
  renderEntry?: (actions: { openOverall: () => void; openSettingBook: () => void }) => ReactNode;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<SettingsView>(null);
  const { settings, configs } = runtime;
  const selectedNodeConfig = selectedAgentId ? configs[selectedAgentId] : null;
  const selectedConnectionConfig = selectedAgentId ? getAgentConnectionConfig(settings, selectedAgentId) : null;
  const nodeDialogConfig = selectedNodeConfig && selectedConnectionConfig ? {
    ...selectedNodeConfig,
    baseUrl: selectedConnectionConfig.baseUrl,
    model: selectedConnectionConfig.model
  } : null;

  function open(next: Exclude<SettingsView, null>) {
    onCloseNode();
    setView(next);
  }

  const fallbackEntry = renderEntry ? null : (
    <div className={`magi-settings-entry-group magi-settings-entry-group--${variant}`}>
      <button type="button" className="magi-settings-entry" onClick={() => open('overall')}>{t('common.setting')}</button>
      <button type="button" className="magi-settings-entry" onClick={() => open('book')}>{t('common.settingBook')}</button>
    </div>
  );

  const dialogs = <>
    <AgentConfigDialog
      config={view === 'overall' ? settings.global : nodeDialogConfig}
      overall={view === 'overall'}
      variant={variant}
      resolveTestConfig={(config) => {
        if (view === 'overall' || !selectedAgentId) return config;
        return resolveAgentConfigs({ ...settings,
          nodes: { ...settings.nodes, [selectedAgentId]: prepareNodeConfig(settings, config) },
          sources: { ...settings.sources, [selectedAgentId]: selectedAgentId }
        })[selectedAgentId];
      }}
      onClose={() => { setView(null); onCloseNode(); }}
      onSave={(config) => {
        if (view === 'overall') {
          runtime.saveGlobalConfig(config);
        } else if (selectedAgentId) {
          // 连接参数未被修改时保持原有配置来源，避免仅查看/保存 Prompt 就脱离全局继承。
          const before = configs[selectedAgentId];
          const savedConnection = getAgentConnectionConfig(settings, selectedAgentId);
          const untouched = before.connection === config.connection
            && savedConnection.baseUrl === config.baseUrl
            && savedConnection.model === config.model
            && before.apiKey === config.apiKey;
          runtime.saveAgentConfig(config, untouched ? settings.sources[selectedAgentId] ?? selectedAgentId : selectedAgentId);
        }
        onSaved?.();
      }}
    />
    <SettingBookDialog
      open={view === 'book'}
      background={settings.background}
      variant={variant}
      onClose={() => setView(null)}
      onSave={(background) => {
        runtime.saveSettingBook(background);
        onSaved?.();
      }}
    />
  </>;

  return <>
    {fallbackEntry}
    {renderEntry?.({ openOverall: () => open('overall'), openSettingBook: () => open('book') })}
    {typeof document === 'undefined' ? dialogs : createPortal(dialogs, document.body)}
  </>;
}
