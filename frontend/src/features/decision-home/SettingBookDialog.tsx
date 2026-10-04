/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isDialogBackdropClick } from './dialog-backdrop';
import { DEFAULT_SETTING_BOOKS, localizeDefaultSettingBook } from '../../domain/setting-book';
import { normalizeLocale } from '../../i18n';
import './AgentConfigDialog.css';

export function SettingBookDialog({ open, background, onClose, onSave, variant = 'modern' }: {
  open: boolean;
  background: string;
  onClose: () => void;
  onSave: (background: string) => void;
  variant?: 'modern' | 'original';
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wasOpen = useRef(false);
  const [draft, setDraft] = useState(background);

  // Resolve the editable draft before the modal paints, avoiding the previous locale flashing.
  useLayoutEffect(() => {
    if (open) {
      if (!wasOpen.current) setDraft(localizeDefaultSettingBook(background, locale));
      else setDraft((current) => localizeDefaultSettingBook(current, locale));
    }
    wasOpen.current = open;
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open, background, locale]);

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
      className={`magi-home__config-dialog magi-home__config-dialog--${variant} magi-home__setting-book-dialog`}
      lang={locale}
      aria-labelledby="magi-setting-book-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => { if (isDialogBackdropClick(event)) closeDialog(); }}
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
        <button type="button" className="magi-home__restore-background" onClick={() => setDraft(DEFAULT_SETTING_BOOKS[locale])}>{t('book.restore')}</button>
        <footer className="magi-home__config-actions">
          <button type="button" onClick={closeDialog}>{t('common.cancel')}</button>
          <button type="submit">{t('book.save')}</button>
        </footer>
      </form>
    </dialog>
  );
}
