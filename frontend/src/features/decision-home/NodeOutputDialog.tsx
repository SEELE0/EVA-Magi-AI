/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { lazy, Suspense, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { AgentId, Decision } from '../../domain/decision';
import { NODE_VOTE_LABELS } from './vote-labels';
import { isDialogBackdropClick } from './dialog-backdrop';
import './node-output-dialog.css';

// Load the existing experiment renderer only when a node output is opened.
const EvaWaveformScope = lazy(() => import('../../../design_test/eva-waveform/EvaWaveformScope'));

export function NodeOutputDialog({ agentId, decision, name, error, onClose }: {
  agentId: AgentId;
  decision: Decision | null;
  name: string;
  error?: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const terminalRef = useRef<HTMLPreElement>(null);
  const follow = useRef(true);
  const vote = decision?.votes[agentId] ?? 'pending';
  const failed = Boolean(decision?.failures?.[agentId]) || Boolean(error && vote === 'pending');
  const preview = decision?.partialResponses?.[agentId];
  const finished = vote !== 'pending';
  const state = failed ? 'failed' : finished ? 'completed' : preview !== undefined ? 'receiving' : 'waiting';
  const text = decision?.responses?.[agentId] ?? decision?.outputs?.[agentId]?.response ?? preview;
  const displayName = decision?.agentNames?.[agentId] ?? name;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement || previousFocus instanceof SVGElement) previousFocus.focus();
    };
  }, []);

  useLayoutEffect(() => {
    if (follow.current && terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [text]);

  return createPortal(<dialog ref={dialogRef} className="node-output-dialog" aria-labelledby={titleId}
    data-state={state} onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (isDialogBackdropClick(event)) onClose(); }}>
    <header className="node-output-dialog__heading">
      <div><small>{t('stream.title')}</small><h2 id={titleId}>{displayName}</h2></div>
      <span className={`node-output-dialog__state vote-${vote}`} role="status">
        {failed ? t('stream.failed') : finished ? NODE_VOTE_LABELS[vote] : t(`stream.${state}`)}
      </span>
      <button type="button" aria-label={t('stream.close')} onClick={onClose}>×</button>
    </header>
    <div className="node-output-dialog__terminal">
      <div className="node-output-dialog__rail" aria-hidden="true">MAGI / NODE OUTPUT</div>
      <pre ref={terminalRef} aria-label={`${displayName} · ${t('stream.answer')}`} onScroll={event => {
        const el = event.currentTarget;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}>{text || t(`stream.${failed ? 'failedHint' : finished ? 'noAnswer' : 'waitingHint'}`)}
        {!failed && !finished ? <span className="node-output-dialog__cursor" aria-hidden="true">▌</span> : null}
      </pre>
      {failed ? <p className="node-output-dialog__notice" role="status">{t('stream.failedHint')}</p>
        : !finished ? <p className="node-output-dialog__notice">{t('stream.previewNotice')}</p> : null}
    </div>
    <div className="node-output-dialog__waveform">
      <Suspense fallback={<div className="node-output-dialog__waveform-placeholder" aria-hidden="true" />}>
        <EvaWaveformScope paused={false} showTimecode label={t('stream.waveform')} />
      </Suspense>
    </div>
  </dialog>, document.body);
}
