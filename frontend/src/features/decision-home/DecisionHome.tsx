/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useEffect, useState } from 'react';
import type { Agent, AgentId, SystemStatus } from '../../domain/decision';
import { createDecisionService } from '../../services/create-decision-service';
import type { DecisionService } from '../../services/decision-service';
import { Readout } from '../decision-console/ConsolePrimitives';
import {
  connectionCopy,
  defaultAgents,
  sourceCopy
} from '../decision-console/console-config';
import { AgentConfigDialog } from './AgentConfigDialog';
import { DecisionSimulator } from './DecisionSimulator';
import { currentSimulatorRoute } from './hash-route';
import { HistoryDetail, HistoryList } from './HistoryViews';
import { loadDecisionHistory, prependDecisionHistory, saveDecisionHistory } from './history-store';
import { cloneAgentConfigs } from './simulator-config';
import type { AgentConfigMap, AgentRuntimeConfig, DecisionHistoryEntry, SimulatorRoute } from './simulator-types';
import './decision-home.css';

const service: DecisionService = createDecisionService();
const nervLogoUrl = new URL('../../../asset/images-1.png', import.meta.url).href;

function formatTime(date: Date) {
  return date.toLocaleTimeString('ja-JP', { hour12: false });
}

export function DecisionHome() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [clock, setClock] = useState(() => new Date());
  const [route, setRoute] = useState<SimulatorRoute>(() => currentSimulatorRoute());
  const [history, setHistory] = useState<DecisionHistoryEntry[]>(() => loadDecisionHistory());
  const [configs, setConfigs] = useState<AgentConfigMap>(() => cloneAgentConfigs());
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let isActive = true;

    void Promise.all([service.getSystemStatus(), service.getAgents()])
      .then(([nextStatus, nextAgents]) => {
        if (!isActive) return;
        setStatus(nextStatus);
        setAgents(nextAgents);
      })
      .catch(() => {
        if (isActive) setStartupError('起動シーケンスが中断されました');
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const updateRoute = () => setRoute(currentSimulatorRoute());
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  function addHistoryEntry(entry: DecisionHistoryEntry) {
    setHistory((current) => {
      const next = prependDecisionHistory(current, entry);
      saveDecisionHistory(next);
      return next;
    });
  }

  function saveAgentConfig(config: AgentRuntimeConfig) {
    setConfigs((current) => ({ ...current, [config.agentId]: config }));
  }

  const selectedAgentConfig = selectedAgentId ? configs[selectedAgentId] : null;
  const isHistoryRoute = route.name !== 'decision';

  return (
    <main className="magi-home">
      <div className="screen-noise" aria-hidden="true" />
      <div className="magi-home__scanlines" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            <img src={nervLogoUrl} alt="" />
          </span>
          <div>
            <p className="eyebrow">特務機関NERV</p>
            <h1>MAGI <span>System</span></h1>
          </div>
        </div>
        <div className="header-readout">
          <Readout label="回線" value={status ? connectionCopy[status.connection] : '起動中'} tone={status?.connection ?? 'offline'} />
          <Readout label="系統" value={status ? sourceCopy[status.source] : 'ローカル'} tone="online" />
          <Readout label="時刻" value={formatTime(clock)} tone="online" />
        </div>
      </header>

      <section className="magi-home__navigation" aria-label="システム状態と主ナビゲーション">
        <div className="magi-home__system-status" aria-live="polite">
          <span aria-hidden="true" />
          <strong>{startupError ?? status?.notice ?? '神経接続を確立中...'}</strong>
          <small>{status?.protocol ?? 'MAGI/3.0'}</small>
        </div>
        <nav aria-label="MAGI シミュレータ">
          <a href="#/" aria-current={!isHistoryRoute ? 'page' : undefined}>判定</a>
          <a href="#/history" aria-current={isHistoryRoute ? 'page' : undefined}>履歴</a>
        </nav>
      </section>

      {route.name === 'decision' ? (
        <DecisionSimulator
          service={service}
          agents={agents}
          configs={configs}
          onOpenConfig={setSelectedAgentId}
          onHistoryCreated={addHistoryEntry}
          onStatusChange={setStatus}
        />
      ) : route.name === 'history' ? (
        <HistoryList entries={history} />
      ) : (
        <HistoryDetail entry={history.find((entry) => entry.id === route.id)} />
      )}

      <AgentConfigDialog
        config={selectedAgentConfig}
        onClose={() => setSelectedAgentId(null)}
        onSave={saveAgentConfig}
      />
    </main>
  );
}
