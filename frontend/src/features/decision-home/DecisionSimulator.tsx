/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Agent, AgentId, Decision, DecisionRequest, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { isTerminalDecision, pollDecisionUntilTerminal } from '../../services/poll-decision';
import { AgentNode } from '../decision-console/ConsolePrimitives';
import {
  defaultPriority,
  healthCopy,
  scenarioSubject,
  voteCopy,
  verdictCopy,
  type Scenario
} from '../decision-console/console-config';
import {
  DECISION_NETWORK_LAYOUT,
  toDecisionNetworkCssVariables,
  toDecisionNetworkTopologyPath,
  toSvgPoints,
  type DecisionNodePosition
} from './decision-network-layout';
import { createDecisionHistoryEntry } from './simulator-responses';
import type { AgentConfigMap, DecisionHistoryEntry } from './simulator-types';

interface DecisionSimulatorProps {
  service: DecisionService;
  agents: Agent[];
  configs: AgentConfigMap;
  onOpenConfig: (agentId: AgentId) => void;
  onHistoryCreated: (entry: DecisionHistoryEntry) => void;
  onStatusChange: (status: SystemStatus) => void;
}

const scenarioCopy: Record<Scenario, string> = {
  standard: '標準',
  reject: '否決検証',
  review: '保留検証'
};

const priorityCopy: Record<DecisionRequest['priority'], string> = {
  low: '低',
  normal: '通常',
  critical: '最優先'
};

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
  return (
    <section className="magi-home__link-strip" aria-label="MAGI 直连状态">
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
  const verdictLabel = isExecuting ? '判定中' : verdictCopy[verdict].label;
  const verdictDetail = isExecuting ? '三人格の投票を受信中' : verdictCopy[verdict].detail;

  return (
    <section className={`magi-home__motion-banner verdict-${isExecuting ? 'pending' : verdict}`} aria-live="polite">
      <p>RESULT OF THE DELIBERATION</p>
      <h2>MOTION: <span>{subject || '未入力'}</span></h2>
      <div className="magi-home__motion-result">
        <span>FINAL VERDICT</span>
        <strong>{verdictLabel}</strong>
        <small>{verdictDetail}</small>
      </div>
    </section>
  );
}

function FailureBanner({ decisionId, message }: { decisionId?: string; message: string }) {
  return (
    <section className="magi-home__failure-banner" role="alert" aria-live="assertive">
      <div className="magi-home__failure-stripe" aria-hidden="true" />
      <div>
        <span>SIGNAL FAILURE / {shortDecisionCode(decisionId)}</span>
        <strong>DIRECT LINK INTERRUPTED</strong>
        <small>{message}</small>
      </div>
      <b>RETRY ENABLED</b>
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
  const subjectLength = Array.from(subject).length;
  const payloadLevel = Math.min(100, Math.max(4, (subjectLength / 240) * 100));
  const priorityLevel = priority === 'critical' ? 100 : priority === 'normal' ? 66 : 33;
  const execMode = phase === 'deliberation' ? 'EXEC' : phase === 'error' ? 'FAULT' : 'HOLD';
  const rows = [
    { label: 'CODE', value: shortDecisionCode(decisionId) },
    { label: 'FILE', value: 'MAGI.SYS' },
    { label: 'PAYLOAD', value: `${subjectLength.toString().padStart(3, '0')} CH`, level: payloadLevel },
    { label: 'EXEC MODE', value: execMode },
    { label: 'PRIORITY', value: priorityCode(priority), level: priorityLevel }
  ];

  return (
    <aside className="magi-home__system-stack" aria-label="MAGI 系统参数">
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
              <strong>{agent.id}</strong>
              <b>{voteCopy[vote]}</b>
              <small>{healthCopy[agent.health]} / {agent.latencyMs}ms</small>
              <span
                className="magi-home__latency-rail"
                style={{ '--magi-level': `${Math.min(100, (agent.latencyMs / 80) * 100)}%` } as CSSProperties}
                aria-hidden="true"
              />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function NodeConfigHotspots({ disabled, onOpen }: { disabled: boolean; onOpen: (agentId: AgentId) => void }) {
  const hotspots: Array<{ agentId: AgentId; position: 'top' | 'left' | 'right' }> = [
    { agentId: 'BALTHASAR-2', position: 'top' },
    { agentId: 'CASPER-3', position: 'left' },
    { agentId: 'MELCHIOR-1', position: 'right' }
  ];

  return (
    <div className="magi-home__node-hotspots" aria-label="人格ノード設定">
      {hotspots.map(({ agentId, position }) => (
        <div key={agentId} className={`magi-home__node-hotspot is-${position}`}>
          <button
            type="button"
            onClick={() => onOpen(agentId)}
            disabled={disabled}
            aria-label={`${agentId} の設定を開く`}
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
  onOpenConfig,
  onHistoryCreated,
  onStatusChange
}: DecisionSimulatorProps) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [scenario, setScenario] = useState<Scenario>('standard');
  const [subject, setSubject] = useState(scenarioSubject.standard);
  const [priority, setPriority] = useState<DecisionRequest['priority']>(defaultPriority);
  const [isExecuting, setIsExecuting] = useState(false);
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

  function cancelActiveRun() {
    activeController.current?.abort();
    activeController.current = null;
  }

  function selectScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setSubject(scenarioSubject[nextScenario]);
    setDecision(null);
    setError(null);
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
    if (!subject.trim()) {
      setError('MAGIに送信する議題を入力してください。');
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
        { subject: subject.trim(), priority, simulationHint: scenario },
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
      onHistoryCreated(createDecisionHistoryEntry(completed, scenario, agents, configs));
      onStatusChange(await service.getSystemStatus());
    } catch (cause) {
      const shouldReportError = mounted.current;
      controller.abort();
      await polling?.catch(() => undefined);
      if (shouldReportError) {
        setError(cause instanceof Error ? cause.message : '判定回線に障害が発生しました');
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

        <section className="magi-home__decision-stage" aria-label="MAGI 合议マトリクス">
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
              <small>第03中枢</small>
            </div>
            {agents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                vote={votes?.[agent.id] ?? 'pending'}
                position={agentPosition[agent.id]}
              />
            ))}
            <NodeConfigHotspots disabled={isExecuting} onOpen={onOpenConfig} />
          </div>
        </section>

        {showTerminal ? <LayerStack agents={agents} votes={votes} /> : null}
      </div>

      <section className="magi-home__input-dock" aria-labelledby="magi-home-input-title">
        {showTerminal ? (
          <div className="magi-home__input-summary" aria-label="当前动议">
            <span>ACTIVE MOTION</span>
            <strong>{subject}</strong>
            <small>{priorityCopy[priority]} / {scenarioCopy[scenario]}</small>
          </div>
        ) : null}
        <label className="magi-home__subject-field" htmlFor="magi-home-subject">
          <span id="magi-home-input-title">判定議題</span>
          <textarea
            id="magi-home-subject"
            value={subject}
            onChange={(event) => updateSubject(event.target.value)}
            maxLength={240}
            disabled={isExecuting}
            rows={3}
            placeholder="一つの議題（問い）を入力してください…"
          />
          <small>{subject.length} / 240</small>
        </label>

        <label className="magi-home__dock-field" htmlFor="magi-home-priority">
          <span>優先度</span>
          <select
            id="magi-home-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as DecisionRequest['priority'])}
            disabled={isExecuting}
          >
            {(Object.keys(priorityCopy) as DecisionRequest['priority'][]).map((item) => (
              <option key={item} value={item}>{priorityCopy[item]}</option>
            ))}
          </select>
        </label>

        <label className="magi-home__dock-field" htmlFor="magi-home-scenario">
          <span>シナリオ</span>
          <select
            id="magi-home-scenario"
            value={scenario}
            onChange={(event) => selectScenario(event.target.value as Scenario)}
            disabled={isExecuting}
          >
            {(Object.keys(scenarioCopy) as Scenario[]).map((item) => (
              <option key={item} value={item}>{scenarioCopy[item]}</option>
            ))}
          </select>
        </label>

        <button className="magi-home__execute" type="button" onClick={() => void runDecision()} disabled={isExecuting}>
          <span>{isExecuting ? '判定実行中' : '判定開始'}</span>
          <small>EXECUTE DECISION</small>
        </button>

        {phase === 'final' ? (
          <button className="magi-home__new-motion" type="button" onClick={resetForNewMotion}>
            <span>新しい動議</span>
            <small>NEW MOTION</small>
          </button>
        ) : null}

        {error ? <p className="magi-home__error" aria-hidden="true">{error}</p> : null}
      </section>
    </div>
  );
}
