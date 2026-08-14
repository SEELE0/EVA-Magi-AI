/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { connectionModeCopy } from './simulator-config';
import type { AgentConnectionMode, AgentRuntimeConfig } from './simulator-types';

interface AgentConfigDialogProps {
  config: AgentRuntimeConfig | null;
  onClose: () => void;
  onSave: (config: AgentRuntimeConfig) => void;
}

const connectionModes = Object.keys(connectionModeCopy) as AgentConnectionMode[];

export function AgentConfigDialog({ config, onClose, onSave }: AgentConfigDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AgentRuntimeConfig | null>(config ? { ...config } : null);

  useEffect(() => {
    const dialog = dialogRef.current;
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
    onSave({ ...draft });
    closeDialog();
  }

  return (
    <dialog
      ref={dialogRef}
      className="magi-home__config-dialog"
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
            <strong>設定シミュレーション</strong>
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
                    onChange={() => setDraft({ ...draft, connection: mode })}
                  />
                  <span>{connectionModeCopy[mode]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="magi-home__config-field">
            <span>BASE URL</span>
            <input
              type={draft.connection === 'mock' ? 'text' : 'url'}
              inputMode={draft.connection === 'mock' ? 'text' : 'url'}
              value={draft.baseUrl}
              onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              autoComplete="off"
              required={draft.connection !== 'mock'}
            />
          </label>

          <label className="magi-home__config-field">
            <span>MODEL</span>
            <input
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              autoComplete="off"
            />
          </label>

          <label className="magi-home__config-field">
            <span>API KEY</span>
            <input
              type="password"
              value={draft.apiKey}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              autoComplete="new-password"
              spellCheck={false}
            />
          </label>

          <label className="magi-home__config-field magi-home__config-prompt">
            <span>役割カード PROMPT</span>
            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              rows={9}
            />
          </label>

          <p className="magi-home__credential-note">
            API KEY は現在のページメモリ内だけに保持されます。模擬版は資格情報を送信・保存しません。
          </p>

          <footer className="magi-home__config-actions">
            <button type="button" onClick={closeDialog}>取消</button>
            <button type="submit">設定を保存</button>
          </footer>
        </form>
      ) : null}
    </dialog>
  );
}
