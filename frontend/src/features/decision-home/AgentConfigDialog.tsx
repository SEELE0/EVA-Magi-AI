/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MOCK_CONNECTION_BASE_URL, connectionModeCopy, mockModelFor } from './simulator-config';
import type { AgentConnectionMode, AgentRuntimeConfig } from './simulator-types';
import './AgentConfigDialog.css';
import { validateAgentConfig } from '../../providers/chat-completions-provider';

interface AgentConfigDialogProps {
  config: AgentRuntimeConfig | null;
  onClose: () => void;
  onSave: (config: AgentRuntimeConfig) => void;
  variant?: 'modern' | 'original';
}

const connectionModes = Object.keys(connectionModeCopy) as AgentConnectionMode[];

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

export function AgentConfigDialog({ config, onClose, onSave, variant = 'modern' }: AgentConfigDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AgentRuntimeConfig | null>(config ? { ...config } : null);

  useEffect(() => {
    const dialog = dialogRef.current;
    setError(null);
    setDraft(config ? { ...config } : null);

    if (config && dialog && !dialog.open) dialog.showModal();
    if (!config && dialog?.open) dialog.close();
  }, [config]);

  function closeDialog() {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    try { validateAgentConfig(draft); } catch (cause) {
      setError(cause instanceof Error ? cause.message : '設定を確認してください。');
      return;
    }
    onSave({ ...draft });
    closeDialog();
  }

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
              <p>NODE CONFIGURATION</p>
              <h2 id="magi-home-config-title">{draft.agentId} ノード設定</h2>
            </div>
            <button type="button" className="magi-home__dialog-close" onClick={closeDialog} aria-label="設定を閉じる">
              <span aria-hidden="true">×</span>
              <span>閉じる</span>
            </button>
          </header>

          <div className="magi-home__config-identity">
            <span>役割（ロール）</span>
            <strong>{draft.role}</strong>
            <span>状態</span>
            <strong>{draft.connection === 'mock' ? '模擬回線' : '接続設定'}</strong>
          </div>

          <fieldset className="magi-home__connection-options">
            <legend>接続方式</legend>
            <div>
              {connectionModes.map((mode) => (
                <label key={mode}>
                  <input
                    type="radio"
                    name="agent-connection"
                    value={mode}
                    checked={draft.connection === mode}
                    onChange={() => setDraft((current) => (current ? switchConnection(current, mode) : current))}
                  />
                  <span>{connectionModeCopy[mode]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {draft.connection !== 'mock' ? <>
          <label className="magi-home__config-field">
            <span>BASE URL</span>
            <input
              type="url"
              inputMode="url"
              maxLength={500}
              value={draft.baseUrl}
              onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              autoComplete="off"
              placeholder="https://api.openai.com/v1"
              required
            />
          </label>

          <label className="magi-home__config-field">
            <span>MODEL</span>
            <input
              required
              maxLength={200}
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              autoComplete="off"
              placeholder="例：gpt-4o-mini / glm-4.6 / local-model"
            />
          </label>

          <label className="magi-home__config-field">
            <span>API KEY</span>
            <input
              type="password"
              maxLength={4096}
              value={draft.apiKey}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              autoComplete="new-password"
              spellCheck={false}
              placeholder="sk-…（ローカル互換では省略可）"
            />
          </label>

          </> : <p className="magi-home__credential-note">模擬回線を使用中。接続情報の入力は不要です。</p>}

          <label className="magi-home__config-field magi-home__config-prompt">
            <span>役割カード PROMPT</span>
            <textarea
              maxLength={12000}
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              rows={9}
            />
          </label>

          {draft.connection !== 'mock' ? (
            <p className="magi-home__credential-note">
              ブラウザから接続先へ直接通信します（CORS 許可が必要）。API KEY はページメモリ内だけに保持され、
              保存・送信（接続先以外）は行われません。再読み込み後は再入力が必要です。
            </p>
          ) : null}

          {error ? <p role="alert">{error}</p> : null}
          <footer className="magi-home__config-actions">
            <button type="button" onClick={closeDialog}>取消</button>
            <button type="submit">設定を保存</button>
          </footer>
        </form>
      ) : null}
    </dialog>
  );
}
