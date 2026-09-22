/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { AGENT_IDS, type DecisionRequest, type Verdict } from '../../domain/decision';
import { verdictCopy, voteCopy } from '../decision-console/console-config';
import { historyDetailHref } from './hash-route';
import { connectionModeCopy } from './simulator-config';
import type { DecisionHistoryEntry } from './simulator-types';

const priorityCopy: Record<DecisionRequest['priority'], string> = {
  low: '低',
  normal: '通常',
  critical: '最優先'
};

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function verdictTone(verdict: Verdict) {
  return verdict === 'approved' ? 'approved' : verdict === 'rejected' ? 'rejected' : 'review';
}

export function HistoryList({ entries }: { entries: DecisionHistoryEntry[] }) {
  return (
    <section className="magi-home__history" aria-labelledby="magi-home-history-title">
      <header className="magi-home__page-heading">
        <div>
          <p>DECISION ARCHIVE</p>
          <h2 id="magi-home-history-title">判定履歴</h2>
        </div>
        <span>{entries.length.toString().padStart(2, '0')} RECORDS</span>
      </header>

      {entries.length === 0 ? (
        <div className="magi-home__empty-state">
          <strong>記録された判定はありません</strong>
          <p>判定画面で議題を実行すると、三人格の投票と完全出力がここに保存されます。</p>
          <a href="#/">最初の判定を開始</a>
        </div>
      ) : (
        <ol className="magi-home__history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a href={historyDetailHref(entry.id)}>
                <time dateTime={entry.completedAt}>{formatHistoryTime(entry.completedAt)}</time>
                <span className="magi-home__history-subject">{entry.subject}</span>
                <span className={`magi-home__history-verdict is-${verdictTone(entry.verdict)}`}>
                  {entry.status === 'failed' ? '実行失敗' : verdictCopy[entry.verdict].label}
                </span>
                <span className="magi-home__history-votes" aria-label="三人格の投票">
                  {AGENT_IDS.map((agentId) => <i key={agentId} title={agentId} aria-label={`${agentId}: ${voteCopy[entry.votes[agentId]]}`} data-vote={entry.votes[agentId]}>{agentId[0]} · {voteCopy[entry.votes[agentId]]}</i>)}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function HistoryDetail({ entry }: { entry?: DecisionHistoryEntry }) {
  if (!entry) {
    return (
      <section className="magi-home__history magi-home__history-detail" aria-labelledby="magi-home-missing-title">
        <div className="magi-home__empty-state">
          <strong id="magi-home-missing-title">指定された判定記録が見つかりません</strong>
          <p>記録が削除されたか、URL が正しくない可能性があります。</p>
          <a href="#/history">履歴一覧を確認</a>
        </div>
      </section>
    );
  }

  return (
    <article className="magi-home__history magi-home__history-detail">
      <a className="magi-home__back-link" href="#/history">← 履歴に戻る</a>

      <header className="magi-home__detail-heading">
        <div className="magi-home__detail-subject">
          <span>質問</span>
          <h2>{entry.subject}</h2>
        </div>
        <div>
          <span>最終判定</span>
          <strong className={`is-${verdictTone(entry.verdict)}`}>{entry.status === 'failed' ? '実行失敗' : verdictCopy[entry.verdict].label}</strong>
        </div>
        <div>
          <span>三人格の投票</span>
          <strong>{AGENT_IDS.filter((id) => entry.votes[id] === 'approve').length} 承認 / {AGENT_IDS.filter((id) => entry.votes[id] === 'reject').length} 否決 / {AGENT_IDS.filter((id) => entry.votes[id] === 'abstain').length} 保留</strong>
        </div>
        <div>
          <span>日時</span>
          <time dateTime={entry.completedAt}>{formatHistoryTime(entry.completedAt)}</time>
        </div>
        <div>
          <span>優先度</span>
          <strong>{priorityCopy[entry.priority]}</strong>
        </div>
      </header>

      <div className="magi-home__agent-outputs">
        {AGENT_IDS.map((agentId) => {
          const result = entry.agents[agentId];
          return (
            <section key={agentId} className="magi-home__agent-output" aria-labelledby={`history-agent-${agentId}`}>
              <header>
                <div>
                  <h3 id={`history-agent-${agentId}`}>{result.agentId} <span>/ {result.role}</span></h3>
                  <strong>投票：{voteCopy[result.vote]}</strong>
                </div>
              </header>
              <div className="magi-home__response-copy">
                {result.response.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
              <details className="magi-home__connection-details">
                <summary>接続情報 · {result.connection === 'unknown' ? '未提供' : connectionModeCopy[result.connection]}</summary>
                <dl>
                  <div><dt>接続</dt><dd>{result.connection === 'unknown' ? '未提供' : connectionModeCopy[result.connection]}</dd></div>
                  <div><dt>使用モデル</dt><dd>{result.model}</dd></div>
                  <div><dt>BASE URL</dt><dd>{result.baseUrl}</dd></div>
                </dl>
              </details>
            </section>
          );
        })}
      </div>
    </article>
  );
}
