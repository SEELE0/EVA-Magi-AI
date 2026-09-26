/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentId } from '../../domain/decision';
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

  return <>
    {fallbackEntry}
    {renderEntry?.({ openOverall: () => open('overall'), openSettingBook: () => open('book') })}
    <AgentConfigDialog
      config={view === 'overall' ? settings.global : selectedAgentId ? settings.nodes[selectedAgentId] : null}
      globalConfig={view === 'overall' ? undefined : settings.global}
      source={selectedAgentId ? settings.sources[selectedAgentId] : 'global'}
      sourceConfigs={configs}
      overall={view === 'overall'}
      variant={variant}
      onClose={() => { setView(null); onCloseNode(); }}
      onSave={(config, source) => {
        if (view === 'overall') runtime.saveGlobalConfig(config);
        else if (selectedAgentId) runtime.saveAgentConfig(config, source ?? selectedAgentId);
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
}
