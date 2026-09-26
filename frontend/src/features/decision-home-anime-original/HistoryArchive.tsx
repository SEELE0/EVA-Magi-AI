/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_IDS } from '../../domain/decision';
import type { DecisionHistoryEntry } from '../decision-home/simulator-types';

export function HistoryArchive({ entries, onClose }: { entries: DecisionHistoryEntry[]; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const voteLabel = (vote: string) => t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  return (
    <dialog className="direct-history" ref={dialog} aria-labelledby="direct-history-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="direct-history__panel">
        <header><div><small>{t('history.localArchive')}</small><h2 id="direct-history-title">{t('history.title')} <span>{String(entries.length).padStart(2, '0')}</span></h2></div><button type="button" onClick={onClose} aria-label={t('history.close')} autoFocus>{t('common.close')} ×</button></header>
        <p className="direct-history__notice">{t('history.recent', { count: Math.min(entries.length, 30) })}</p>
        {entries.length === 0 ? <p className="direct-history__empty">{t('history.noRecords')}</p> : (
          <ol>{entries.map((entry) => <li key={entry.id}>
            <details>
              <summary><time dateTime={entry.completedAt}>{new Date(entry.completedAt).toLocaleString(i18n.language)}</time><strong>{entry.subject}</strong><span className={`direct-history__verdict is-${entry.verdict}`}>{entry.status === 'failed' ? t('history.failed') : t(`verdict.${entry.verdict}`)}</span></summary>
              <div className="direct-history__detail"><p>{entry.subject}</p><dl>{AGENT_IDS.map((id) => <div key={id}><dt>{id}</dt><dd>{voteLabel(entry.votes[id])}</dd></div>)}</dl>
                {AGENT_IDS.map((id) => entry.agents[id].response ? <details key={id}><summary>{id} / {t('history.response')}</summary><p>{entry.agents[id].response}</p></details> : null)}
              </div>
            </details>
          </li>)}</ol>
        )}
      </div>
    </dialog>
  );
}
