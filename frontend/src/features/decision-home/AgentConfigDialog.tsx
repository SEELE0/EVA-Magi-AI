/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeDefaultAgentPrompt, type AgentConnectionMode, type AgentRuntimeConfig } from '../../domain/agent-config';
import { ChatCompletionsProvider, validateAgentConfig } from '../../providers/chat-completions-provider';
import { MOCK_CONNECTION_BASE_URL, mockModelFor } from './simulator-config';
import './AgentConfigDialog.css';
import { localizeError } from '../../i18n-error';
import { normalizeLocale } from '../../i18n';

interface AgentConfigDialogProps {
  config: AgentRuntimeConfig | null;
  onClose: () => void;
  onSave: (config: AgentRuntimeConfig) => void;
  overall?: boolean;
  variant?: 'modern' | 'original';
}

const connectionModes: AgentConnectionMode[] = ['mock', 'openai-compatible', 'local-compatible'];
type ConnectionTestStatus = 'idle' | 'testing' | 'success' | 'failure';

/** 接続方式切替時に模擬回線の哨兵値と実接続の空欄を入れ替える。 */
function switchConnection(draft: AgentRuntimeConfig, mode: AgentConnectionMode): AgentRuntimeConfig {
  const next = { ...draft, connection: mode };
  const wasMock = draft.connection === 'mock';
  if (!wasMock && mode === 'mock') {
    next.baseUrl = MOCK_CONNECTION_BASE_URL;
    next.model = mockModelFor(draft.agentId);
    return next;
  }
  if (wasMock && mode !== 'mock') {
    if (!draft.baseUrl || draft.baseUrl === MOCK_CONNECTION_BASE_URL) next.baseUrl = '';
    if (!draft.model || draft.model.startsWith('MAGI-SIM')) next.model = '';
  }
  return next;
}

export function AgentConfigDialog({
  config,
  onClose,
  onSave,
  variant = 'modern',
  overall = false
}: AgentConfigDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN');
  const [draft, setDraft] = useState<AgentRuntimeConfig | null>(config ? {
    ...config,
    prompt: localizeDefaultAgentPrompt(config.agentId, config.prompt, locale)
  } : null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const [testStatusKind, setTestStatusKind] = useState<ConnectionTestStatus>('idle');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const testController = useRef<AbortController | null>(null);
  // 以弹窗目标（节点 ID / overall）作为重置依据：config 对象引用在每次父级渲染时都会变化，
  // 若直接依赖 config，外部状态刷新会不停重置 draft，导致输入无法进行。
  const dialogKey = config ? `${overall ? 'overall' : config.agentId}` : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    setError(null);
    setDraft(config ? {
      ...config,
      prompt: localizeDefaultAgentPrompt(config.agentId, config.prompt, locale)
    } : null);
    setApiKeyVisible(false);
    if (config && dialog && !dialog.open) dialog.showModal();
    if (!config && dialog?.open) dialog.close();
  }, [dialogKey]);

  useEffect(() => {
    setDraft((current) => {
      if (!current) return current;
      const prompt = localizeDefaultAgentPrompt(current.agentId, current.prompt, locale);
      return prompt === current.prompt ? current : { ...current, prompt };
    });
  }, [locale]);

  useEffect(() => {
    testController.current?.abort();
    testController.current = null;
    setTesting(false);
    setTestStatus('');
    setTestStatusKind('idle');
    return () => testController.current?.abort();
  }, [draft]);

  function closeDialog() {
    testController.current?.abort();
    testController.current = null;
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  }

  async function testConnection() {
    if (!draft || testing) return;
    const controller = new AbortController();
    testController.current = controller;
    setTesting(true);
    setTestStatusKind('testing');
    setTestStatus(t('settings.testing'));
    const start = performance.now();
    try {
      await new ChatCompletionsProvider(15000).testConnection(draft, controller.signal);
      if (testController.current === controller) {
        setTestStatusKind('success');
        setTestStatus(t('settings.testSuccess', { ms: Math.round(performance.now() - start) }));
      }
    } catch (cause) {
      if (testController.current === controller && !controller.signal.aborted) {
        setTestStatusKind('failure');
        setTestStatus(t('settings.testFailed', { ms: Math.round(performance.now() - start), message: localizeError(cause, t) }));
      }
    } finally {
      if (testController.current === controller) setTesting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    try {
      validateAgentConfig(draft);
      onSave({ ...draft });
      closeDialog();
    } catch (cause) {
      setError(localizeError(cause, t));
    }
  }

  const connectionLabel = (mode: AgentConnectionMode) => mode === 'mock'
    ? t('settings.mock') : mode === 'openai-compatible' ? t('settings.openai') : t('settings.local');

  return (
    <dialog
      ref={dialogRef}
      className={`magi-home__config-dialog magi-home__config-dialog--${variant}`}
      aria-labelledby="magi-home-config-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        if (config) onClose();
      }}
    >
      {draft ? (
        <form method="dialog" className="magi-home__config-form" onSubmit={submit}>
          <header className="magi-home__config-header">
            <div>
              <p>{overall ? t('settings.system') : t('settings.node')}</p>
              <h2 id="magi-home-config-title">{overall ? t('settings.globalTitle') : t('settings.nodeTitle', { id: draft.agentId })}</h2>
            </div>
            <button type="button" className="magi-home__dialog-close" onClick={closeDialog} aria-label={t('settings.close')}>
              <span aria-hidden="true">×</span>
            </button>
          </header>

          {!overall ? <div className="magi-home__config-identity">
              <span>{t('settings.role')}</span>
              <strong>{draft.role}</strong>
            </div>
          : draft.connection !== 'mock' ? <p className="magi-home__credential-note">{t('settings.security')}</p> : null}

          <fieldset className="magi-home__connection-fields">
            <fieldset className="magi-home__connection-options">
              <legend>{t('settings.connection')}</legend>
              <div>
                {connectionModes.map((mode) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      name={`agent-connection-${draft.agentId}`}
                      value={mode}
                      checked={draft.connection === mode}
                      onChange={() => {
                        setDraft((current) => (current ? switchConnection(current, mode) : current));
                        setApiKeyVisible(false);
                      }}
                    />
                    <span>{connectionLabel(mode)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {draft.connection !== 'mock' ? <>
              <label className="magi-home__config-field">
                <span>{t('settings.baseUrl')}</span>
                <input type="url" inputMode="url" maxLength={500} value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} autoComplete="off" placeholder="https://api.openai.com/v1" required />
              </label>
              <label className="magi-home__config-field">
                <span>{t('settings.model')}</span>
                <input required maxLength={200} value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} autoComplete="off" placeholder={t('settings.modelPlaceholder')} />
              </label>
              <div className="magi-home__config-field magi-home__api-key-field">
                <label htmlFor={`magi-home-api-key-${draft.agentId}`}>{t('settings.apiKey')}</label>
                <div className="magi-home__api-key-control">
                  <input
                    id={`magi-home-api-key-${draft.agentId}`}
                    className="magi-home__api-key-input"
                    type={apiKeyVisible ? 'text' : 'password'}
                    maxLength={4096}
                    value={draft.apiKey}
                    onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder={t('settings.apiKeyPlaceholder')}
                  />
                  <button
                    type="button"
                    className="magi-home__api-key-toggle"
                    aria-label={t(apiKeyVisible ? 'settings.hideApiKey' : 'settings.showApiKey')}
                    title={t(apiKeyVisible ? 'settings.hideApiKey' : 'settings.showApiKey')}
                    onClick={() => setApiKeyVisible((visible) => !visible)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      {apiKeyVisible ? <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                        <path d="M9.9 5.2A11.4 11.4 0 0112 5c6.4 0 10 7 10 7a13.4 13.4 0 01-3.1 3.7" />
                        <path d="M6.6 6.6C3.7 8.3 2 12 2 12s3.6 7 10 7a10.8 10.8 0 004.1-.8" />
                      </> : <>
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>}
                    </svg>
                  </button>
                </div>
              </div>
            </> : <p className="magi-home__credential-note">{t('settings.mockHelp')}</p>}
          </fieldset>

          <div className="magi-home__connection-test">
            <button type="button" onClick={() => void testConnection()} disabled={testing || draft.connection === 'mock'}>{t('settings.test')}</button>
            <p className="magi-home__connection-test-status" data-state={testStatusKind} role="status" aria-live="polite">
              {testStatus || (draft.connection === 'mock' ? t('settings.mockWarning') : t('settings.testHelp'))}
            </p>
          </div>

          {!overall ? <label className="magi-home__config-field magi-home__config-prompt">
            <span>{t('settings.prompt')}</span>
            <textarea maxLength={12000} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} rows={9} />
          </label> : null}

          {!overall && draft.connection !== 'mock' ? <p className="magi-home__credential-note">{t('settings.security')}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          <footer className="magi-home__config-actions">
            <button type="button" onClick={closeDialog}>{t('common.cancel')}</button>
            <button type="submit">{t('settings.save')}</button>
          </footer>
        </form>
      ) : null}
    </dialog>
  );
}
