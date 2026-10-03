/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { AGENT_IDS, type DecisionRequest, type Verdict } from '../../domain/decision';
import { useTranslation } from 'react-i18next';
import { historyDetailHref } from './hash-route';
import type { DecisionHistoryEntry } from './simulator-types';

function formatHistoryTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
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
  const { t, i18n } = useTranslation();
  const voteLabel = (vote: DecisionHistoryEntry['votes'][typeof AGENT_IDS[number]]) => t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`);
  return (
    <section className="magi-home__history" aria-labelledby="magi-home-history-title">
      <header className="magi-home__page-heading">
        <div>
          <p>{t('history.archive')}</p>
          <h2 id="magi-home-history-title">{t('history.title')}</h2>
        </div>
        <span>{entries.length.toString().padStart(2, '0')} {t('history.records')}</span>
      </header>

      {entries.length === 0 ? (
        <div className="magi-home__empty-state">
          <strong>{t('history.empty')}</strong>
          <p>{t('history.emptyHelp')}</p>
          <a href="#/">{t('history.start')}</a>
        </div>
      ) : (
        <ol className="magi-home__history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <a href={historyDetailHref(entry.id)}>
                <time dateTime={entry.completedAt}>{formatHistoryTime(entry.completedAt, i18n.language)}</time>
                <span className="magi-home__history-subject">{entry.subject}</span>
                <span className={`magi-home__history-verdict is-${verdictTone(entry.verdict)}`}>
                  {entry.status === 'failed' ? t('history.failed') : t(`verdict.${entry.verdict}`)}
                </span>
                <span className="magi-home__history-votes" aria-label={t('history.votes')}>
                  {AGENT_IDS.map((agentId) => {
                    const name = entry.agents[agentId].displayName ?? agentId;
                    return <i key={agentId} title={name} aria-label={`${name}: ${voteLabel(entry.votes[agentId])}`} data-vote={entry.votes[agentId]}>{Array.from(name)[0]} · {voteLabel(entry.votes[agentId])}</i>;
                  })}
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
  const { t, i18n } = useTranslation();
  const priorityCopy: Record<DecisionRequest['priority'], string> = {
    low: t('decision.low'), normal: t('decision.normal'), critical: t('decision.critical')
  };
  const voteLabel = (vote: DecisionHistoryEntry['votes'][typeof AGENT_IDS[number]]) => t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`);
  const connectionLabel = (connection: string) => connection === 'unknown' ? t('common.unavailable')
    : connection === 'mock' ? t('settings.mock')
      : connection === 'openai-compatible' ? t('settings.openai') : t('settings.local');
  if (!entry) {
    return (
      <section className="magi-home__history magi-home__history-detail" aria-labelledby="magi-home-missing-title">
        <div className="magi-home__empty-state">
          <strong id="magi-home-missing-title">{t('history.missing')}</strong>
          <p>{t('history.missingHelp')}</p>
          <a href="#/history">{t('history.backList')}</a>
        </div>
      </section>
    );
  }

  return (
    <article className="magi-home__history magi-home__history-detail">
      <a className="magi-home__back-link" href="#/history">← {t('history.back')}</a>

      <header className="magi-home__detail-heading">
        <div className="magi-home__detail-subject">
          <span>{t('history.subject')}</span>
          <h2>{entry.subject}</h2>
        </div>
        <div>
          <span>{t('history.final')}</span>
          <strong className={`is-${verdictTone(entry.verdict)}`}>{entry.status === 'failed' ? t('history.failed') : t(`verdict.${entry.verdict}`)}</strong>
        </div>
        <div>
          <span>{t('history.votes')}</span>
          <strong>{AGENT_IDS.filter((id) => entry.votes[id] === 'approve').length} {t('status.approve')} / {AGENT_IDS.filter((id) => entry.votes[id] === 'reject').length} {t('status.reject')} / {AGENT_IDS.filter((id) => entry.votes[id] === 'abstain').length} {t('status.abstain')}</strong>
        </div>
        <div>
          <span>{t('history.dateTime')}</span>
          <time dateTime={entry.completedAt}>{formatHistoryTime(entry.completedAt, i18n.language)}</time>
        </div>
        <div>
          <span>{t('decision.priority')}</span>
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
                  <h3 id={`history-agent-${agentId}`}>{result.displayName ?? result.agentId} <span>/ {result.role}</span></h3>
                  <strong>{t('history.vote')}：{voteLabel(result.vote)}</strong>
                </div>
              </header>
              <div className="magi-home__response-copy">
                {result.response.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
              <details className="magi-home__connection-details">
                <summary>{t('settings.connection')} · {connectionLabel(result.connection)}</summary>
                <dl>
                  <div><dt>{t('settings.connection')}</dt><dd>{connectionLabel(result.connection)}</dd></div>
                  <div><dt>{t('settings.model')}</dt><dd>{result.model}</dd></div>
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
