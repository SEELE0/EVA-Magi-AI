/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useEffect, useRef, useState } from 'react';
import type { Agent, AgentId, Decision, DecisionRequest, SystemStatus } from '../../domain/decision';
import type { DecisionService } from '../../services/decision-service';
import { AgentNode } from '../decision-console/ConsolePrimitives';
import {
  defaultPriority,
  scenarioSubject,
  verdictCopy,
  type Scenario
} from '../decision-console/console-config';
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
          <span aria-hidden="true">設定を開く</span>
        </div>
      ))}
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
  const pollTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
  }, []);

  function stopPolling() {
    if (pollTimer.current === null) return;
    window.clearInterval(pollTimer.current);
    pollTimer.current = null;
  }

  function selectScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setSubject(scenarioSubject[nextScenario]);
  }

  async function runDecision() {
    if (isExecuting) return;
    if (!subject.trim()) {
      setError('MAGIに送信する議題を入力してください。');
      return;
    }

    setError(null);
    setIsExecuting(true);
    stopPolling();

    try {
      const created = await service.createDecision({ subject: subject.trim(), priority, simulationHint: scenario });
      setDecision(created);
      const execution = service.executeDecision(created.id);

      pollTimer.current = window.setInterval(() => {
        void service.getDecision(created.id).then(setDecision).catch(() => undefined);
      }, 220);

      const completed = await execution;
      stopPolling();
      setDecision(completed);
      onHistoryCreated(createDecisionHistoryEntry(completed, scenario, agents, configs));
      onStatusChange(await service.getSystemStatus());
    } catch (cause) {
      stopPolling();
      setError(cause instanceof Error ? cause.message : '判定回線に障害が発生しました');
    } finally {
      setIsExecuting(false);
    }
  }

  const votes = decision?.votes;
  const verdict = decision?.verdict ?? 'pending';

  return (
    <div className="magi-home__simulator">
      <section className="magi-home__decision-stage" aria-label="MAGI 合議マトリクス">
        <div className={`magi-network ${isExecuting ? 'is-scanning' : ''}`}>
          <svg className="network-links" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true">
            <g className="network-connectors">
              <line x1="259.2" y1="180" x2="193.2" y2="208" vectorEffect="non-scaling-stroke" />
              <line x1="340.8" y1="180" x2="406.8" y2="208" vectorEffect="non-scaling-stroke" />
              <line x1="276" y1="333.8" x2="324" y2="333.8" vectorEffect="non-scaling-stroke" />
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
              position={agent.id === 'BALTHASAR-2' ? 'top' : agent.id === 'CASPER-3' ? 'left' : 'right'}
            />
          ))}
          <NodeConfigHotspots disabled={isExecuting} onOpen={onOpenConfig} />
        </div>
      </section>

      <section className="magi-home__input-dock" aria-labelledby="magi-home-input-title">
        <label className="magi-home__subject-field" htmlFor="magi-home-subject">
          <span id="magi-home-input-title">判定議題</span>
          <textarea
            id="magi-home-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
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

        <div className={`magi-home__compact-verdict verdict-${verdict}`} aria-live="polite">
          <span>最終判定</span>
          <strong>{isExecuting ? '判定中' : verdictCopy[verdict].label}</strong>
          <small>{isExecuting ? '三人格の投票を受信中' : verdictCopy[verdict].detail}</small>
        </div>

        {error ? <p className="magi-home__error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
