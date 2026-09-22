/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useState } from 'react';
import type { Agent, AgentId, SystemStatus } from '../../domain/decision';
import { Readout } from '../decision-console/ConsolePrimitives';
import {
  connectionCopy,
  defaultAgents
} from '../decision-console/console-config';
import { AgentConfigDialog } from './AgentConfigDialog';
import { DecisionSimulator } from './DecisionSimulator';
import { currentSimulatorRoute } from './hash-route';
import { HistoryDetail, HistoryList } from './HistoryViews';
import { loadDecisionHistory, prependDecisionHistory, saveDecisionHistory } from './history-store';
import { useDecisionRuntime } from './use-decision-runtime';
import type { AgentRuntimeConfig, DecisionHistoryEntry, SimulatorRoute } from './simulator-types';
import './decision-home.css';
import './decision-header.css';

const nervLogoUrl = new URL('../../../asset/images-1.png', import.meta.url).href;

function formatTime(date: Date) {
  return date.toLocaleTimeString('ja-JP', { hour12: false });
}

export function DecisionHome({ entryRevealReady = true }: { entryRevealReady?: boolean }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [clock, setClock] = useState(() => new Date());
  const [route, setRoute] = useState<SimulatorRoute>(() => currentSimulatorRoute());
  const [historyWarning, setHistoryWarning] = useState(false);
  const [history, setHistory] = useState<DecisionHistoryEntry[]>(() => loadDecisionHistory());
  const { configs, service, saveAgentConfig: saveConfig, storageWarning } = useDecisionRuntime();
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
      setHistoryWarning(!saveDecisionHistory(next));
      return next;
    });
  }

  function saveAgentConfig(config: AgentRuntimeConfig) {
    saveConfig(config);
    // 接続方式の変更をステータス行へ即時反映する。
    void service.getSystemStatus().then(setStatus).catch(() => undefined);
  }

  const selectedAgentConfig = selectedAgentId ? configs[selectedAgentId] : null;
  const isHistoryRoute = route.name !== 'decision';

  return (
    <main className="magi-home">
      <div className="screen-noise" aria-hidden="true" />
      <div className="magi-home__scanlines" aria-hidden="true" />
      <header className="magi-home__masthead">
      <div className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            <img src={nervLogoUrl} alt="" />
          </span>
          <div>
            <p className="eyebrow">特務機関NERV</p>
            <h1>MAGI <span>System</span></h1>
          </div>
        </div>
        <nav className="magi-home__primary-nav" aria-label="MAGI シミュレータ">
          <a href="#/" aria-current={!isHistoryRoute ? 'page' : undefined}>判定</a>
          <a href="#/history" aria-current={isHistoryRoute ? 'page' : undefined}>履歴</a>
        </nav>
      </div>
      <div className="magi-home__telemetry" aria-label="システム状態">
        <div className="magi-home__system-status" data-connection={startupError ? 'offline' : status?.connection ?? 'offline'} aria-live="polite">
          <span aria-hidden="true" />
          <strong>{startupError ?? status?.notice ?? '神経接続を確立中...'}</strong>
          <small>{status?.protocol ?? 'MAGI/3.0'}</small>
        </div>
        <div className="header-readout">
          <Readout label="回線" value={status ? connectionCopy[status.connection] : '起動中'} tone={status?.connection ?? 'offline'} />
          <Readout label="時刻" value={formatTime(clock)} tone="online" />
        </div>
      </div>
      </header>

      {storageWarning || historyWarning ? <p role="status">本机存储不可用，设置或记录仅保留在当前页面。</p> : null}
      {route.name === 'decision' ? (
        <DecisionSimulator
          service={service}
          agents={agents}
          configs={configs}
          revealReady={entryRevealReady}
          onOpenConfig={setSelectedAgentId}
          onHistoryCreated={addHistoryEntry}
          onStatusChange={(nextStatus) => {
            setStatus(nextStatus);
            void service.getAgents().then(setAgents).catch(() => undefined);
          }}
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
