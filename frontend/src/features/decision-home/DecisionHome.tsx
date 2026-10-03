/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Agent, AgentId, SystemStatus } from '../../domain/decision';
import { Readout } from '../decision-console/ConsolePrimitives';
import { defaultAgents } from '../decision-console/console-config';
import { RuntimeSettings } from './RuntimeSettings';
import { DecisionSimulator } from './DecisionSimulator';
import { currentSimulatorRoute } from './hash-route';
import { HistoryDetail, HistoryList } from './HistoryViews';
import { loadDecisionHistory, prependDecisionHistory, saveDecisionHistory } from './history-store';
import { useDecisionRuntime } from './use-decision-runtime';
import type { DecisionHistoryEntry, SimulatorRoute } from './simulator-types';
import { LanguageSelector } from '../../components/LanguageSelector';
import { NixieClock } from './NixieClock';
import { NodeConnectionStatus } from './NodeConnectionStatus';
import './decision-home.css';
import './decision-header.css';

const nervLogoUrl = new URL('../../../asset/images-1.png', import.meta.url).href;

export function DecisionHome({ entryRevealReady = true }: { entryRevealReady?: boolean }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [route, setRoute] = useState<SimulatorRoute>(() => currentSimulatorRoute());
  const [historyWarning, setHistoryWarning] = useState(false);
  const [history, setHistory] = useState<DecisionHistoryEntry[]>(() => loadDecisionHistory());
  const runtime = useDecisionRuntime();
  const { configs, service, storageWarning } = runtime;
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navControlsRef = useRef<HTMLDivElement>(null);
  const navMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let isActive = true;

    void Promise.all([service.getSystemStatus(), service.getAgents()])
      .then(([nextStatus, nextAgents]) => {
        if (!isActive) return;
        setStatus(nextStatus);
        setAgents(nextAgents);
      })
      .catch(() => {
        if (isActive) setStartupError(t('status.startupError'));
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

  useEffect(() => {
    if (!navMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      const isLanguageOption = target instanceof Element && target.closest('.magi-select__positioner--language-icon');
      if (!navControlsRef.current?.contains(target as Node) && !isLanguageOption) setNavMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNavMenuOpen(false);
      navMenuButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [navMenuOpen]);

  function addHistoryEntry(entry: DecisionHistoryEntry) {
    setHistory((current) => {
      const next = prependDecisionHistory(current, entry);
      setHistoryWarning(!saveDecisionHistory(next));
      return next;
    });
  }

  const isHistoryRoute = route.name !== 'decision';
  const connectionMode = status?.source ?? (import.meta.env.VITE_API_MODE === 'remote' ? 'remote' : 'mock');

  return (
    <main className="magi-home">
      <div className="screen-noise" aria-hidden="true" />
      <div className="magi-home__scanlines" aria-hidden="true" />
      <header className="magi-home__masthead" data-nav-menu-open={navMenuOpen}>
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
          <div className="magi-home__nav-controls" ref={navControlsRef}>
            <button
              ref={navMenuButtonRef}
              type="button"
              className="magi-home__nav-menu-toggle"
              aria-expanded={navMenuOpen}
              aria-controls="magi-primary-navigation"
              aria-label={navMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              title={navMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              onClick={() => setNavMenuOpen((open) => !open)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                {navMenuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <nav id="magi-primary-navigation" className="magi-home__primary-nav" aria-label={t('nav.label')} data-menu-open={navMenuOpen}>
              <a href="#/" aria-current={!isHistoryRoute ? 'page' : undefined} onClick={() => setNavMenuOpen(false)}>
                <span className="nav-bracket" aria-hidden="true">[</span>
                <span>{t('common.decision')}</span>
                <span className="nav-bracket" aria-hidden="true">]</span>
              </a>
              <a href="#/history" aria-current={isHistoryRoute ? 'page' : undefined} onClick={() => setNavMenuOpen(false)}>
                <span className="nav-bracket" aria-hidden="true">[</span>
                <span>{t('common.history')}</span>
                <span className="nav-bracket" aria-hidden="true">]</span>
              </a>
              <RuntimeSettings
                runtime={runtime}
                selectedAgentId={selectedAgentId}
                onCloseNode={() => setSelectedAgentId(null)}
                onSaved={() => { void service.getSystemStatus().then(setStatus).catch(() => undefined); }}
                renderEntry={({ openOverall, openSettingBook }) => <div className="magi-home__nav-actions">
                  <button type="button" className="magi-home__nav-button" onClick={() => { setNavMenuOpen(false); openOverall(); }}>{t('nav.settings')}</button>
                  <button type="button" className="magi-home__nav-button" onClick={() => { setNavMenuOpen(false); openSettingBook(); }}>{t('common.settingBook')}</button>
                </div>}
              />
            </nav>
            <LanguageSelector onLocaleChange={() => setNavMenuOpen(false)} />
          </div>
        </div>
        <div className="magi-home__telemetry" aria-label={t('nav.status')}>
          <NodeConnectionStatus service={service} configs={configs} protocol={status?.protocol ?? 'MAGI/3.0'} startupFailed={Boolean(startupError)} />
          <div className="header-readout">
            <Readout label={t('settings.connection')} value={t(`connectionMode.${connectionMode}`)} tone={status?.connection ?? 'offline'} />
            <NixieClock label={i18n.language.startsWith('en') ? 'TIME' : i18n.language === 'zh-TW' ? '時間' : i18n.language.startsWith('zh') ? '时间' : '時刻'} />
          </div>
        </div>
      </header>

      {storageWarning || historyWarning ? <p role="status">{t('history.notStored')}</p> : null}
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


    </main>
  );
}
