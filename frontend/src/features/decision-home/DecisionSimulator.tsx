/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HoneycombReveal } from './HoneycombReveal';
import { markHoneycombRevealAsPlayed, shouldPlayHoneycombReveal } from './honeycomb-reveal';
import type { Agent, AgentId, Decision, DecisionRequest, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { isTerminalDecision, pollDecisionUntilTerminal } from '../../services/poll-decision';
import { AgentNode } from '../decision-console/ConsolePrimitives';
import { defaultPriority, defaultSubject } from '../decision-console/console-config';
import {
  DECISION_NETWORK_LAYOUT,
  toDecisionNetworkCssVariables,
  toDecisionNetworkTopologyPath,
  toSvgPoints,
  type DecisionNodePosition
} from './decision-network-layout';
import { createDecisionHistoryEntry } from './simulator-responses';
import type { AgentConfigMap, DecisionHistoryEntry } from './simulator-types';
import { localizeError } from '../../i18n-error';

interface DecisionSimulatorProps {
  service: DecisionService;
  agents: Agent[];
  configs: AgentConfigMap;
  /** False while the boot intro overlay owns the screen; the entry reveal waits for it. */
  revealReady?: boolean;
  onOpenConfig: (agentId: AgentId) => void;
  onHistoryCreated: (entry: DecisionHistoryEntry) => void;
  onStatusChange: (status: SystemStatus) => void;
}

const agentPosition: Record<AgentId, DecisionNodePosition> = {
  'BALTHASAR-2': 'top',
  'CASPER-3': 'left',
  'MELCHIOR-1': 'right'
};

const agentIdByPosition: Record<DecisionNodePosition, AgentId> = {
  top: 'BALTHASAR-2',
  left: 'CASPER-3',
  right: 'MELCHIOR-1'
};

const decisionNetworkStyle = {
  ...toDecisionNetworkCssVariables(DECISION_NETWORK_LAYOUT),
  aspectRatio: `${DECISION_NETWORK_LAYOUT.viewBox.width} / ${DECISION_NETWORK_LAYOUT.viewBox.height}`
} as CSSProperties;
const decisionNetworkTopologyPath = toDecisionNetworkTopologyPath(DECISION_NETWORK_LAYOUT);

type SimulatorPhase = 'standby' | 'deliberation' | 'final' | 'error';

function shortDecisionCode(id?: string) {
  if (!id) return 'WAITING';
  return id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
}

function priorityCode(priority: DecisionRequest['priority']) {
  return priority === 'critical' ? 'AAA' : priority === 'normal' ? 'AA' : 'A';
}

function LinkStrip() {
  const { t } = useTranslation();
  return (
    <section className="magi-home__link-strip" aria-label={t('decision.directStatus')}>
      <span>DIRECT LINK CONNECTION: MAGI 01</span>
      <strong>ACCESS MODE: SUPERUSER</strong>
    </section>
  );
}

function MotionBanner({
  subject,
  verdict,
  isExecuting
}: {
  subject: string;
  verdict: Decision['verdict'];
  isExecuting: boolean;
}) {
  const { t } = useTranslation();
  const verdictLabel = isExecuting ? t('decision.pending') : t(`verdict.${verdict}`);
  const verdictDetail = isExecuting ? t('decision.receivingVotes') : t(`verdict.${verdict}Detail`);

  return (
    <section className={`magi-home__motion-banner verdict-${isExecuting ? 'pending' : verdict}`} aria-live="polite">
      <p>{t('decision.result')}</p>
      <h2>{t('decision.motion')} <span>{subject || t('decision.emptySubject')}</span></h2>
      <div className="magi-home__motion-result">
        <span>{t('decision.finalVerdict')}</span>
        <strong>{verdictLabel}</strong>
        <small>{verdictDetail}</small>
      </div>
    </section>
  );
}

function FailureBanner({ decisionId, message }: { decisionId?: string; message: string }) {
  const { t } = useTranslation();
  return (
    <section className="magi-home__failure-banner" role="alert" aria-live="assertive">
      <div className="magi-home__failure-stripe" aria-hidden="true" />
      <div>
        <span>{t('decision.failure', { code: shortDecisionCode(decisionId) })}</span>
        <strong>{t('decision.interrupted')}</strong>
        <small>{message}</small>
      </div>
      <b>{t('decision.retry')}</b>
    </section>
  );
}

function SystemStack({
  decisionId,
  phase,
  subject,
  priority
}: {
  decisionId?: string;
  phase: SimulatorPhase;
  subject: string;
  priority: DecisionRequest['priority'];
}) {
  const { t } = useTranslation();
  const subjectLength = Array.from(subject).length;
  const payloadLevel = Math.min(100, Math.max(4, (subjectLength / 240) * 100));
  const priorityLevel = priority === 'critical' ? 100 : priority === 'normal' ? 66 : 33;
  const execMode = phase === 'deliberation' ? 'EXEC' : phase === 'error' ? 'FAULT' : 'HOLD';
  const rows = [
    { label: 'CODE', value: shortDecisionCode(decisionId) },
    { label: 'FILE', value: 'MAGI.SYS' },
    { label: 'PAYLOAD', value: `${subjectLength.toString().padStart(3, '0')} CH`, level: payloadLevel },
    { label: 'EXEC MODE', value: execMode },
    { label: t('decision.priority'), value: priorityCode(priority), level: priorityLevel }
  ];

  return (
    <aside className="magi-home__system-stack" aria-label={t('decision.systemParameters')}>
      <p className="magi-home__stack-heading">SYSTEM / CODE</p>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            {row.level ? (
              <span
                className="magi-home__threshold-bar"
                style={{ '--magi-level': `${row.level}%` } as CSSProperties}
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </dl>
    </aside>
  );
}

function LayerStack({ agents, votes }: { agents: Agent[]; votes?: Decision['votes'] }) {
  const { t } = useTranslation();
  return (
    <aside className="magi-home__layer-stack" aria-label="MAGI 人格层">
      <p className="magi-home__stack-heading">PERSONALITY / LAYER</p>
      <ol>
        {agents.map((agent, index) => {
          const vote = votes?.[agent.id] ?? agent.vote;
          return (
            <li className={`vote-${vote}`} key={agent.id}>
              <span>LAYER-{String(index + 1).padStart(2, '0')}</span>
              <strong>{agent.id}</strong>
              <b>{t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`)}</b>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function NodeConfigHotspots({ disabled, onOpen }: { disabled: boolean; onOpen: (agentId: AgentId) => void }) {
  const { t } = useTranslation();
  const hotspots: Array<{ agentId: AgentId; position: 'top' | 'left' | 'right' }> = [
    { agentId: 'BALTHASAR-2', position: 'top' },
    { agentId: 'CASPER-3', position: 'left' },
    { agentId: 'MELCHIOR-1', position: 'right' }
  ];

  return (
    <div className="magi-home__node-hotspots" aria-label={t('decision.nodeConfig')}>
      {hotspots.map(({ agentId, position }) => (
        <div key={agentId} className={`magi-home__node-hotspot is-${position}`}>
          <button
            type="button"
            onClick={() => onOpen(agentId)}
            disabled={disabled}
            aria-label={`${agentId} · ${t('decision.nodeConfig')}`}
          />
        </div>
      ))}
    </div>
  );
}

function InstrumentOverlay() {
  return (
    <div className="magi-home__instrument-overlay" aria-hidden="true">
      <i className="is-top-left" />
      <i className="is-top-right" />
      <i className="is-bottom-left" />
      <i className="is-bottom-right" />
      <span className="magi-home__calibration-rail is-left">00&nbsp;&nbsp;25&nbsp;&nbsp;50&nbsp;&nbsp;75&nbsp;&nbsp;99</span>
      <span className="magi-home__calibration-rail is-bottom">REF-03 / MAGI SYNC FIELD</span>
    </div>
  );
}

export function DecisionSimulator({
  service,
  agents,
  configs,
  revealReady = true,
  onOpenConfig,
  onHistoryCreated,
  onStatusChange
}: DecisionSimulatorProps) {
  const { t } = useTranslation();
  const priorityCopy: Record<DecisionRequest['priority'], string> = {
    low: t('decision.low'),
    normal: t('decision.normal'),
    critical: t('decision.critical')
  };
  const [decision, setDecision] = useState<Decision | null>(null);
  const [subject, setSubject] = useState(defaultSubject);
  const priority = defaultPriority;
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const finishReveal = useCallback(() => {
    markHoneycombRevealAsPlayed();
    setIsRevealing(false);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeController.current?.abort();
      activeController.current = null;
    };
  }, []);

  useEffect(() => {
    if (revealReady && shouldPlayHoneycombReveal()) setIsRevealing(true);
  }, [revealReady]);

  function cancelActiveRun() {
    activeController.current?.abort();
    activeController.current = null;
  }

  function updateSubject(nextSubject: string) {
    setSubject(nextSubject);
    setDecision(null);
    setError(null);
  }

  function resetForNewMotion() {
    setDecision(null);
    setSubject('');
    setError(null);
  }

  async function runDecision() {
    if (isExecuting) return;
    finishReveal();
    if (!subject.trim()) {
      setError(t('decision.subjectRequired'));
      return;
    }

    setError(null);
    setIsExecuting(true);
    cancelActiveRun();

    const controller = new AbortController();
    activeController.current = controller;
    let polling: Promise<Decision> | null = null;

    try {
      const requestOptions = { signal: controller.signal };
      const created = await service.createDecision(
        { subject: subject.trim(), priority },
        requestOptions
      );
      if (!mounted.current || controller.signal.aborted) return;
      setDecision(created);
      polling = pollDecisionUntilTerminal(service, created.id, {
        ...requestOptions,
        onDecision: setDecision
      });
      const execution = await service.executeDecision(created.id, requestOptions);
      const completed = isTerminalDecision(execution) ? execution : await polling;
      controller.abort();
      await polling.catch(() => undefined);
      if (!mounted.current) return;
      setDecision(completed);
      onHistoryCreated(createDecisionHistoryEntry(completed, 'standard', agents, configs));
      try {
        onStatusChange(await service.getSystemStatus());
      } catch {
        // A status refresh must not turn an already completed decision into a UI error.
      }
      if (completed.status === 'failed') setError(t('decision.nodeFailed'));
    } catch (cause) {
      const shouldReportError = mounted.current;
      controller.abort();
      await polling?.catch(() => undefined);
      if (shouldReportError) {
        setError(localizeError(cause, t));
      }
    } finally {
      if (activeController.current === controller) activeController.current = null;
      if (mounted.current) setIsExecuting(false);
    }
  }

  const votes = decision?.votes;
  const verdict = decision?.verdict ?? 'pending';
  const hasTerminalDecision = decision ? isTerminalDecision(decision) : false;
  const phase: SimulatorPhase = isExecuting
    ? 'deliberation'
    : error
      ? 'error'
      : hasTerminalDecision
        ? 'final'
        : 'standby';
  const showTerminal = phase === 'deliberation' || phase === 'final';

  return (
    <div className={`magi-home__simulator phase-${phase}`} data-phase={phase}>
      {showTerminal ? <LinkStrip /> : null}
      {showTerminal ? <MotionBanner subject={subject} verdict={verdict} isExecuting={isExecuting} /> : null}
      {error ? <FailureBanner decisionId={decision?.id} message={error} /> : null}

      <div className="magi-home__deliberation-grid">
        {showTerminal ? (
          <SystemStack decisionId={decision?.id} phase={phase} subject={subject} priority={priority} />
        ) : null}

        <section className="magi-home__decision-stage" aria-label={t('decision.matrix')}>
          <InstrumentOverlay />
          <div className={`magi-network ${isExecuting ? 'is-scanning' : ''}`} style={decisionNetworkStyle}>
            <svg
              className="network-links"
              viewBox={`0 0 ${DECISION_NETWORK_LAYOUT.viewBox.width} ${DECISION_NETWORK_LAYOUT.viewBox.height}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <path
                className="network-topology"
                d={decisionNetworkTopologyPath}
                vectorEffect="non-scaling-stroke"
              />
              <g className="network-node-highlights">
                {Object.values(DECISION_NETWORK_LAYOUT.frames).map((frame) => {
                  const vote = votes?.[agentIdByPosition[frame.position]] ?? 'pending';
                  return (
                    <polygon
                      key={frame.position}
                      className={`network-node-frame is-${frame.position} vote-${vote}`}
                      data-node-frame={frame.position}
                      points={toSvgPoints(frame.points)}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            </svg>
            <div className="core-node">
              <span>MAGI</span>
              <small>MAGI/03</small>
            </div>
            {agents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                vote={votes?.[agent.id] ?? 'pending'}
                position={agentPosition[agent.id]}
                showTelemetry={false}
              />
            ))}
            <NodeConfigHotspots disabled={isExecuting || isRevealing} onOpen={onOpenConfig} />
          </div>
          {!showTerminal ? <small className="magi-home__node-hint">{t('decision.nodeHint')}</small> : null}
          {isRevealing ? <HoneycombReveal onComplete={finishReveal} /> : null}
        </section>

        {showTerminal ? <LayerStack agents={agents} votes={votes} /> : null}
      </div>

      <section className="magi-home__input-dock" aria-labelledby="magi-home-input-title">
        {showTerminal ? (
          <div className="magi-home__input-summary" aria-label={t('decision.currentMotion')}>
            <span>{t('decision.activeMotion')}</span>
            <strong>{subject}</strong>
            <small>{priorityCopy[priority]}</small>
          </div>
        ) : null}
        <label className="magi-home__subject-field" htmlFor="magi-home-subject">
          <span id="magi-home-input-title">{t('decision.agenda')}</span>
          <textarea
            id="magi-home-subject"
            value={subject}
            onChange={(event) => updateSubject(event.target.value)}
            maxLength={240}
            disabled={isExecuting}
            rows={2}
            placeholder={t('decision.agendaPlaceholder')}
          />
          <small>{t('decision.characterCount', { count: subject.length })}</small>
        </label>

        <button className="magi-home__execute" type="button" onClick={() => void runDecision()} disabled={isExecuting}>
          <span>{isExecuting ? t('decision.pending') : t('decision.execute')}</span>
          <small>EXECUTE DECISION</small>
        </button>

        {phase === 'final' ? (
          <button className="magi-home__new-motion" type="button" onClick={resetForNewMotion}>
            <span>{t('decision.clear')}</span>
            <small>NEW MOTION</small>
          </button>
        ) : null}

        {error ? <p className="magi-home__error" aria-hidden="true">{error}</p> : null}
      </section>
    </div>
  );
}
