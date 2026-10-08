/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HoneycombReveal } from './HoneycombReveal';
import { markHoneycombRevealAsPlayed, shouldPlayHoneycombReveal } from './honeycomb-reveal';
import { AGENT_IDS, type Agent, type AgentId, type Decision, type DecisionRequest, type SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { isTerminalDecision, pollDecisionUntilTerminal } from '../../services/poll-decision';
import { AgentNode } from '../decision-console/ConsolePrimitives';
import { defaultPriority, defaultSubject } from '../decision-console/console-config';
import {
  DECISION_NETWORK_LAYOUT,
  toDecisionNetworkCssVariables,
  toDecisionNetworkFramePath,
  toDecisionNetworkConnectorPath,
  toSvgPoints,
  type DecisionNodePosition
} from './decision-network-layout';
import { createDecisionHistoryEntry } from './simulator-responses';
import type { AgentConfigMap, DecisionHistoryEntry } from './simulator-types';
import { localizeError } from '../../i18n-error';
import { NODE_VOTE_LABELS } from './vote-labels';
import { agentDisplayName, agentRole } from '../../domain/agent-config';
import { NodeOutputDialog } from './NodeOutputDialog';

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
const decisionNetworkFramePath = toDecisionNetworkFramePath(DECISION_NETWORK_LAYOUT);
const decisionNetworkConnectorPath = toDecisionNetworkConnectorPath(DECISION_NETWORK_LAYOUT);
const decisionNetworkFrames = Object.values(DECISION_NETWORK_LAYOUT.frames);

function DecisionNetworkVisual({ votes, verdict }: { votes?: Decision['votes']; verdict: Decision['verdict'] }) {
  const instanceId = useId();
  const gradientId = `${instanceId}-material`;
  const glowId = `${instanceId}-inner-glow`;
  const materialColor = (position: DecisionNodePosition) => votes?.[agentIdByPosition[position]] === 'abstain' ? '#f1d35c' : '#7df0b0';

  return (
    <svg
      className="network-links"
      data-verdict={verdict}
      viewBox={`0 0 ${DECISION_NETWORK_LAYOUT.viewBox.width} ${DECISION_NETWORK_LAYOUT.viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        {decisionNetworkFrames.map((frame) => (
          <linearGradient key={frame.position} id={`${gradientId}-${frame.position}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={materialColor(frame.position)} stopOpacity={0.04} />
            <stop offset="60%" stopColor={materialColor(frame.position)} stopOpacity={0} />
          </linearGradient>
        ))}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={3} />
        </filter>
        {decisionNetworkFrames.map((frame) => (
          <clipPath key={frame.position} id={`${instanceId}-clip-${frame.position}`} clipPathUnits="userSpaceOnUse">
            <polygon points={toSvgPoints(frame.points)} />
          </clipPath>
        ))}
      </defs>
      <g className="network-node-materials">
        {decisionNetworkFrames.map((frame) => (
          <g key={frame.position}>
            <polygon className="network-node-material" points={toSvgPoints(frame.points)} fill={`url(#${gradientId}-${frame.position})`} />
            <g clipPath={`url(#${instanceId}-clip-${frame.position})`}>
              <polygon
                className="network-node-inner-glow"
                points={toSvgPoints(frame.points)}
                fill="none"
                stroke={materialColor(frame.position)}
                strokeWidth={8}
                strokeOpacity={0.08}
                filter={`url(#${glowId})`}
              />
            </g>
          </g>
        ))}
      </g>
      <path className="network-topology" d={decisionNetworkFramePath} vectorEffect="non-scaling-stroke" />
      <path className="network-connectors" d={decisionNetworkConnectorPath} vectorEffect="non-scaling-stroke" />
      <g className="network-node-highlights">
        {decisionNetworkFrames.map((frame) => (
          <polygon
            key={frame.position}
            className={`network-node-frame is-${frame.position} vote-${votes?.[agentIdByPosition[frame.position]] ?? 'pending'}`}
            data-node-frame={frame.position}
            points={toSvgPoints(frame.points)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g className="network-node-tracers">
        {decisionNetworkFrames.map((frame) => (
          <polygon
            key={frame.position}
            className={`network-node-tracer is-${frame.position} vote-${votes?.[agentIdByPosition[frame.position]] ?? 'pending'}`}
            points={toSvgPoints(frame.points)}
            pathLength={100}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

type SimulatorPhase = 'standby' | 'deliberation' | 'final' | 'error';

function shortDecisionCode(id?: string) {
  if (!id) return 'WAITING';
  return id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
}

function priorityCode(priority: DecisionRequest['priority']) {
  return priority === 'critical' ? 'AAA' : priority === 'normal' ? 'AA' : 'A';
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
      <div className="magi-home__failure-content">
        <span>{t('decision.failure', { code: shortDecisionCode(decisionId) })}</span>
        <strong>{message}</strong>
      </div>
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
  return (
    <aside className="magi-home__layer-stack" aria-label="MAGI 人格层">
      <p className="magi-home__stack-heading">PERSONALITY / LAYER</p>
      <ol>
        {agents.map((agent, index) => {
          const vote = votes?.[agent.id] ?? agent.vote;
          return (
            <li className={`vote-${vote}`} key={agent.id}>
              <span>LAYER-{String(index + 1).padStart(2, '0')}</span>
              <strong title={agent.displayName ?? agent.id}>{agent.displayName ?? agent.id}</strong>
              <b>{NODE_VOTE_LABELS[vote]}</b>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function NodeConfigHotspots({ agents, disabled, output, onOpen }: { agents: Agent[]; disabled: boolean; output: boolean; onOpen: (agentId: AgentId) => void }) {
  const { t } = useTranslation();
  const hotspots: Array<{ agentId: AgentId; position: 'top' | 'left' | 'right' }> = [
    { agentId: 'BALTHASAR-2', position: 'top' },
    { agentId: 'CASPER-3', position: 'left' },
    { agentId: 'MELCHIOR-1', position: 'right' }
  ];

  return (
    <div className="magi-home__node-hotspots" aria-label={t(output ? 'stream.title' : 'decision.nodeConfig')}>
      {hotspots.map(({ agentId, position }) => (
        <div key={agentId} className={`magi-home__node-hotspot is-${position}`}>
          <button
            type="button"
            onClick={() => onOpen(agentId)}
            disabled={disabled}
            aria-label={`${agents.find(agent => agent.id === agentId)?.displayName ?? agentId} · ${t(output ? 'stream.title' : 'decision.nodeConfig')}`}
            aria-haspopup="dialog"
          />
        </div>
      ))}
    </div>
  );
}

function InstrumentOverlay() {
  return (
    <>
      <div className="magi-home__instrument-overlay" aria-hidden="true">
        <i className="is-top-left" />
        <i className="is-top-right" />
        <i className="is-bottom-left" />
        <i className="is-bottom-right" />
      </div>
      <div className="magi-home__instrument-labels" aria-hidden="true">
        <span className="magi-home__calibration-rail is-left">00&nbsp;&nbsp;25&nbsp;&nbsp;50&nbsp;&nbsp;75&nbsp;&nbsp;99</span>
        <span className="magi-home__calibration-rail is-bottom">REF-03 / MAGI SYNC FIELD</span>
      </div>
    </>
  );
}

function TypedNodeHint({ text }: { readonly text: string }) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedCount(characters.length);
      return;
    }
    setTypedCount(0);
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setTypedCount(count);
      if (count >= characters.length) window.clearInterval(timer);
    }, 65);
    return () => window.clearInterval(timer);
  }, [characters]);

  const isTyping = typedCount < characters.length;

  return (
    <small className="magi-home__node-hint">
      <span className="magi-home__hint-full-text">{text}</span>
      <span aria-hidden="true">
        {characters.slice(0, typedCount).join('')}
        <span className={`magi-home__type-cursor${isTyping ? ' is-typing' : ''}`}>_</span>
      </span>
    </small>
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
  const [outputAgentId, setOutputAgentId] = useState<AgentId | null>(null);
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
    setOutputAgentId(null);
    setError(null);
  }

  function resetForNewMotion() {
    setDecision(null);
    setOutputAgentId(null);
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
    setDecision(null);
    setOutputAgentId(null);
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
      if (completed.status === 'failed') {
        const failures = new Map<string, string[]>();
        for (const agentId of AGENT_IDS) {
          const message = completed.failures?.[agentId]?.trim();
          if (!message) continue;
          const name = completed.agentNames?.[agentId] ?? completed.outputs?.[agentId]?.displayName ?? agentDisplayName(configs[agentId], agentId);
          failures.set(message, [...(failures.get(message) ?? []), name]);
        }
        setError(Array.from(failures, ([message, names]) => `${names.join(' / ')}：${message}`).join('\n') || t('decision.nodeFailed'));
      }
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
  const displayAgents = agents.map(agent => ({
    ...agent,
    role: decision?.agentRoles?.[agent.id] ?? decision?.outputs?.[agent.id]?.role ?? agentRole(configs[agent.id], agent.id),
    displayName: decision?.agentNames?.[agent.id] ?? decision?.outputs?.[agent.id]?.displayName ?? agentDisplayName(configs[agent.id], agent.id)
  }));
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
      {showTerminal ? <MotionBanner subject={subject} verdict={verdict} isExecuting={isExecuting} /> : null}
      {error ? <FailureBanner decisionId={decision?.id} message={error} /> : null}

      <div className="magi-home__deliberation-grid">
        {showTerminal ? (
          <SystemStack decisionId={decision?.id} phase={phase} subject={subject} priority={priority} />
        ) : null}

        <section className="magi-home__decision-stage" aria-label={t('decision.matrix')}>
          <InstrumentOverlay />
          <div className={`magi-network ${isExecuting ? 'is-scanning' : ''}`} style={decisionNetworkStyle}>
            <DecisionNetworkVisual votes={votes} verdict={phase === 'final' ? verdict : 'pending'} />
            <div className="core-node">
              <span>MAGI</span>
            </div>
            {displayAgents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                vote={votes?.[agent.id] ?? 'pending'}
                position={agentPosition[agent.id]}
                showTelemetry={false}
                voteLabel={NODE_VOTE_LABELS[votes?.[agent.id] ?? 'pending']}
              />
            ))}
            <NodeConfigHotspots agents={displayAgents} disabled={isRevealing} output={phase === 'deliberation' || phase === 'final'} onOpen={(id) => {
              if (phase === 'deliberation' || phase === 'final') setOutputAgentId(id);
              else { setOutputAgentId(null); onOpenConfig(id); }
            }} />
          </div>
          {!showTerminal ? <TypedNodeHint text={t('decision.nodeHint')} /> : null}
          {isRevealing ? <HoneycombReveal onComplete={finishReveal} /> : null}
        </section>

        {showTerminal ? <LayerStack agents={displayAgents} votes={votes} /> : null}
      </div>

      {outputAgentId ? <NodeOutputDialog agentId={outputAgentId} decision={decision}
        name={displayAgents.find(agent => agent.id === outputAgentId)?.displayName ?? outputAgentId}
        error={error} onClose={() => setOutputAgentId(null)} /> : null}

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
        </button>

        {phase === 'final' ? (
          <button className="magi-home__new-motion" type="button" onClick={resetForNewMotion}>
            <span>{t('decision.clear')}</span>
            <small>NEW MOTION</small>
          </button>
        ) : null}

      </section>
    </div>
  );
}
