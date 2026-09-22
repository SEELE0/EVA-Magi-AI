/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useEffect, useRef } from 'react';
import { AGENT_IDS } from '../../domain/decision';
import { verdictCopy } from '../decision-console/console-config';
import type { DecisionHistoryEntry } from '../decision-home/simulator-types';

export function HistoryArchive({ entries, onClose }: { entries: DecisionHistoryEntry[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  return (
    <dialog className="direct-history" ref={dialog} aria-labelledby="direct-history-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="direct-history__panel">
        <header><div><small>MAGI / LOCAL ARCHIVE</small><h2 id="direct-history-title">判定履歴 <span>{String(entries.length).padStart(2, '0')}</span></h2></div><button type="button" onClick={onClose} aria-label="关闭历史记录" autoFocus>关闭 ×</button></header>
        <p className="direct-history__notice">本机保存 · 最近 30 条判定记录</p>
        {entries.length === 0 ? <p className="direct-history__empty">NO RECORDS<br />尚无历史记录。完成一次判定后自动归档。</p> : (
          <ol>{entries.map((entry) => <li key={entry.id}>
            <details>
              <summary><time dateTime={entry.completedAt}>{new Date(entry.completedAt).toLocaleString()}</time><strong>{entry.subject}</strong><span className={`direct-history__verdict is-${entry.verdict}`}>{entry.status === 'failed' ? '実行失敗' : verdictCopy[entry.verdict]?.label ?? entry.verdict}</span></summary>
              <div className="direct-history__detail"><p>{entry.subject}</p><dl>{AGENT_IDS.map((id) => <div key={id}><dt>{id}</dt><dd>{{ approve: '承認', reject: '否決', abstain: '棄権', pending: '保留' }[entry.votes[id]]}</dd></div>)}</dl>
                {AGENT_IDS.map((id) => entry.agents[id].response ? <details key={id}><summary>{id} / 記録</summary><p>{entry.agents[id].response}</p></details> : null)}
              </div>
            </details>
          </li>)}</ol>
        )}
      </div>
    </dialog>
  );
}
