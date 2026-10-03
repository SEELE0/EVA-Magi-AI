/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { EVA_BACKGROUND } from '../../domain/shared-settings';
import './AgentConfigDialog.css';

export function SettingBookDialog({ open, background, onClose, onSave, variant = 'modern' }: {
  open: boolean;
  background: string;
  onClose: () => void;
  onSave: (background: string) => void;
  variant?: 'modern' | 'original';
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(background);

  useEffect(() => {
    setDraft(background);
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open, background]);

  function closeDialog() {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
    closeDialog();
  }

  return (
    <dialog
      ref={dialogRef}
      className={`magi-home__config-dialog magi-home__config-dialog--${variant}`}
      aria-labelledby="magi-setting-book-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      <form method="dialog" className="magi-home__config-form" onSubmit={submit}>
        <header className="magi-home__config-header">
          <div>
            <p>SETTING BOOK</p>
            <h2 id="magi-setting-book-title">{t('book.title')}</h2>
          </div>
          <button type="button" className="magi-home__dialog-close" onClick={closeDialog} aria-label={t('book.close')}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <p className="magi-home__credential-note">{t('book.description')}</p>
        <label className="magi-home__config-field magi-home__config-prompt magi-home__setting-book-field">
          <span>{t('book.background')}</span>
          <textarea rows={14} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button type="button" className="magi-home__restore-background" onClick={() => setDraft(EVA_BACKGROUND)}>{t('book.restore')}</button>
        <footer className="magi-home__config-actions">
          <button type="button" onClick={closeDialog}>{t('common.cancel')}</button>
          <button type="submit">{t('book.save')}</button>
        </footer>
      </form>
    </dialog>
  );
}
