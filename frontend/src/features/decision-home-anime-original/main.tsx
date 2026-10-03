/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { createRoot } from 'react-dom/client';
import { TerminalMotionInput } from './TerminalMotionInput';
import { type AgentId, type Decision, type DecisionRequest } from '../../domain/decision';
import { agentDisplayName, type AgentConfigMap } from '../../domain/agent-config';
import { HistoryArchive } from './HistoryArchive';
import { loadDecisionHistory, prependDecisionHistory, saveDecisionHistory } from '../decision-home/history-store';
import { useDecisionRuntime } from '../decision-home/use-decision-runtime';
import { createDecisionHistoryEntry } from '../decision-home/simulator-responses';
import type { DecisionService } from '../../services/decision-service';
import { isTerminalDecision, pollDecisionUntilTerminal } from '../../services/poll-decision';
import { RuntimeSettings } from '../decision-home/RuntimeSettings';
import { LanguageSelector } from '../../components/LanguageSelector';
import '../../components/magi-select.css';
import { localizeError } from '../../i18n-error';
import {
  ANIME_ORIGINAL_LAYOUT_PRESETS,
  TERMINAL_MODULE_LAYOUT,
  resolveMagiNetworkPosition,
  toSvgTranslate,
  type AnimeOriginalPanelPlacement,
  type AnimeOriginalLayoutMode,
} from './layout';
import { MagiNetwork } from './MagiNetwork';
import './decision-home-anime-original.css';

export type AnimeOriginalPhase = 'compose' | 'transitioning' | 'deliberation' | 'final' | 'error';

interface DecisionHomeAnimeOriginalProps {
  service?: DecisionService;
}

interface MagiTerminalGraphicProps {
  decision: Decision | null;
  configs: AgentConfigMap;
  layoutMode: AnimeOriginalLayoutMode;
  phase: AnimeOriginalPhase;
  subject: string;
  onOpenConfig: (agentId: AgentId) => void;
}

const DEFAULT_VOTES: Decision['votes'] = {
  'MELCHIOR-1': 'pending',
  'BALTHASAR-2': 'pending',
  'CASPER-3': 'pending',
};
const TRANSITION_DURATION_MS = 520;
const ORIENTATION_QUERY = '(orientation: landscape)';
const WIDE_PORTRAIT_QUERY = '(orientation: portrait) and (min-width: 720px)';


function shortDecisionCode(id?: string) {
  if (!id) return 'WAIT';
  return id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase() || 'WAIT';
}

function priorityCode(priority?: DecisionRequest['priority']) {
  return priority === 'critical' ? 'AAA' : priority === 'low' ? 'A' : 'AA';
}

function systemMode(phase: AnimeOriginalPhase) {
  if (phase === 'transitioning') return 'SYNC';
  if (phase === 'deliberation') return 'EXEC';
  if (phase === 'final') return 'HOLD';
  if (phase === 'error') return 'FAULT';
  return 'IDLE';
}

function animeOriginalStatus(phase: AnimeOriginalPhase, decision: Decision | null, error: string | null, t: ReturnType<typeof useTranslation>['t']) {
  if (phase === 'error') return t('original.failedStatus', { message: error ?? t('original.networkError') });
  if (phase === 'transitioning') return t('original.transitioning');
  if (phase === 'deliberation') return t('original.deliberation');
  if (phase === 'final' && decision) {
    return t('original.final', { verdict: t(`verdict.${decision.verdict}`) });
  }
  return t('original.awaiting');
}

function subscribeToLayout(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const queries = [window.matchMedia(ORIENTATION_QUERY), window.matchMedia(WIDE_PORTRAIT_QUERY)];
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}

function currentLayoutMode(): AnimeOriginalLayoutMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'portrait';
  if (window.matchMedia(ORIENTATION_QUERY).matches) return 'landscape';
  return window.matchMedia(WIDE_PORTRAIT_QUERY).matches ? 'portrait-wide' : 'portrait';
}

function useAnimeOriginalLayoutMode(): AnimeOriginalLayoutMode {
  return useSyncExternalStore(subscribeToLayout, currentLayoutMode, () => 'portrait');
}

function waitForTransition(signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const duration = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 0
    : TRANSITION_DURATION_MS;
  if (duration === 0) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, duration);
    const cancel = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
  });
}

function TerminalHeader({ placement }: { readonly placement: AnimeOriginalPanelPlacement }) {
  const layout = TERMINAL_MODULE_LAYOUT.header;

  return (
    <g className="terminal-orange terminal-header" transform={toSvgTranslate(placement.origin)}>
      <rect width={placement.width} height={placement.height} rx={layout.radius} />
      <line className="terminal-header__divider" x1={layout.frameInset} y1={layout.dividerOffset} x2={placement.width - layout.frameInset} y2={layout.dividerOffset} />
      <text x={layout.contentInset} y={layout.firstBaseline} textLength="299" lengthAdjust="spacingAndGlyphs" className="header-line header-line--small">DIRECT LINK CONNECTION : MAGI 01</text>
      <text x={layout.contentInset} y={layout.secondBaseline} textLength="133" lengthAdjust="spacingAndGlyphs" className="header-line header-line--access">ACCESS MODE :</text>
      <text x={layout.accessValueOffset} y={layout.secondBaseline} textLength="154" lengthAdjust="spacingAndGlyphs" className="header-line header-line--superuser">SUPERUSER</text>
    </g>
  );
}

function MotionResult({ decision, phase, placement, subject }: Pick<MagiTerminalGraphicProps, 'decision' | 'phase' | 'subject'> & { readonly placement: AnimeOriginalPanelPlacement }) {
  const clipId = useId();
  const resultGlowId = useId();
  const contentRef = useRef<SVGGElement>(null);
  const layout = TERMINAL_MODULE_LAYOUT.motion;
  const contentWidth = placement.width - layout.contentInset * 2;
  const secondRailX = layout.railWidth + layout.railGap;
  const rightRailX = placement.width - layout.railWidth;
  const rightSecondRailX = rightRailX - layout.railWidth - layout.railGap;
  const caption = 'RESULT OF THE DELIBERATION';
  const motion = `MOTION:${subject.trim().replace(/\s+/g, ' ') || '--'}`;
  const verdict = decision?.verdict ?? 'pending';

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const agenda = content.querySelector<SVGTextElement>('.motion-title');
    if (!agenda || typeof agenda.getComputedTextLength !== 'function') return;
    const fit = () => {
      agenda.removeAttribute('textLength');
      agenda.textContent = motion;
      // Keep the film's single, tall agenda line legible. The title and history retain the full input.
      const minimumScale = 0.72;
      if (agenda.getComputedTextLength() > contentWidth / minimumScale) {
        const characters = Array.from(motion);
        let low = 0;
        let high = characters.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          agenda.textContent = `${characters.slice(0, middle).join('')}…`;
          if (agenda.getComputedTextLength() <= contentWidth / minimumScale) low = middle;
          else high = middle - 1;
        }
        agenda.textContent = `${characters.slice(0, low).join('')}…`;
      }
      if (agenda.getComputedTextLength() > contentWidth) agenda.setAttribute('textLength', String(contentWidth));
    };
    fit();
    let active = true;
    void document.fonts?.ready.then(() => { if (active) fit(); });
    document.fonts?.addEventListener('loadingdone', fit);
    return () => {
      active = false;
      document.fonts?.removeEventListener('loadingdone', fit);
    };
  }, [motion, contentWidth]);

  return (
    <g className={`motion-result is-${phase === 'error' ? 'error' : verdict}`} transform={toSvgTranslate(placement.origin)}>
      <title>{subject.trim() || 'AWAITING MOTION'}</title>
      <defs>
        <clipPath id={clipId}><rect x={layout.contentInset - 4} width={contentWidth + 8} height={placement.height} /></clipPath>
        <ResultRailGlowFilter id={resultGlowId} />
      </defs>
      <g className="motion-result__rails">
        <rect className="terminal-orange motion-result__rail--outer" width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect className="terminal-orange motion-result__rail--inner" style={phase === 'final' ? { filter: `url(#${resultGlowId})` } : undefined} x={secondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect className="terminal-orange motion-result__rail--inner" style={phase === 'final' ? { filter: `url(#${resultGlowId})` } : undefined} x={rightSecondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect className="terminal-orange motion-result__rail--outer" x={rightRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
      </g>
      <g ref={contentRef} clipPath={`url(#${clipId})`}>
        <text x={layout.contentInset} y="33" textLength={contentWidth} lengthAdjust="spacingAndGlyphs" className="terminal-orange motion-copy">{caption}</text>
        <text x={layout.contentInset} y="69" lengthAdjust="spacingAndGlyphs" className="terminal-orange motion-title">{motion}</text>
      </g>
    </g>
  );
}

function SystemData({ decision, phase, placement, subject }: Pick<MagiTerminalGraphicProps, 'decision' | 'phase' | 'subject'> & { readonly placement: AnimeOriginalPanelPlacement }) {
  const layout = TERMINAL_MODULE_LAYOUT.systemData;
  const lines = [
    `CODE : ${shortDecisionCode(decision?.id)}`,
    'FILE :',
    'MAGI.SYS',
    'PAYLOAD :',
    `${String(Array.from(subject).length).padStart(3, '0')} CH`,
    'EX_MODE :',
    systemMode(phase),
    'PRIORITY :',
    priorityCode(decision?.priority),
  ];

  return (
    <g className="terminal-orange system-data" transform={toSvgTranslate(placement.origin)}>
      {lines.map((line, index) => <text key={`${index}-${line}`} y={index * layout.lineHeight}>{line}</text>)}
    </g>
  );
}

function ConnectionData({ decision, phase, placement }: Pick<MagiTerminalGraphicProps, 'decision' | 'phase'> & { readonly placement: AnimeOriginalPanelPlacement }) {
  const physicalStatus = phase === 'error'
    ? 'L401 - LINK FAULT'
    : phase === 'transitioning'
      ? 'L401 - CONNECTING'
      : phase === 'deliberation'
        ? 'L401 - STREAM ACTIVE'
        : phase === 'final'
          ? 'L401 - RESULT LOCKED'
          : 'L401 - BASIC READY';
  const lines: readonly {
    readonly text: string;
    readonly baseline: number;
    readonly small?: boolean;
    readonly fit?: boolean;
  }[] = [
    { text: 'Layer 3:', baseline: 0 },
    { text: 'Connection Control:', baseline: 26, small: true },
    { text: systemMode(phase), baseline: 52 },
    { text: 'Layer 2:', baseline: 89 },
    { text: 'Data Link:', baseline: 115 },
    { text: decision ? `DL-${shortDecisionCode(decision.id)}` : 'NO CARRIER', baseline: 141 },
    { text: 'Layer 1:', baseline: 178 },
    { text: 'Physical Interface:', baseline: 204, small: true },
    { text: physicalStatus, baseline: 230, small: true, fit: true },
  ];
  const fittedTextLength = placement.width - 8;

  return (
    <g className="terminal-orange connection-data" transform={toSvgTranslate(placement.origin)}>
      {lines.map((line, index) => (
        <text
          key={`${index}-${line.text}`}
          y={line.baseline}
          className={line.small ? 'connection-data__small' : undefined}
          textLength={line.fit ? fittedTextLength : undefined}
          lengthAdjust={line.fit ? 'spacingAndGlyphs' : undefined}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}

function TerminalCalibration({ height, side, width }: { height: number; side: 'left' | 'right'; width: number }) {
  const ticks = Array.from({ length: 12 }, (_, index) => 72 + (index * (height - 144)) / 11);
  const isLeft = side === 'left';
  const cornerPath = isLeft
    ? `M14 52V14H52 M14 ${height - 52}V${height - 14}H52`
    : `M${width - 52} 14H${width - 14}V52 M${width - 52} ${height - 14}H${width - 14}V${height - 52}`;

  return (
    <g className="terminal-calibration" data-calibration-side={side}>
      <path d={cornerPath} />
      {ticks.map((tick, index) => (
        <line
          className={index % 3 === 0 ? 'is-major' : undefined}
          key={tick}
          x1={isLeft ? 10 : width - 10}
          y1={tick}
          x2={isLeft ? (index % 3 === 0 ? 34 : 24) : width - (index % 3 === 0 ? 34 : 24)}
          y2={tick}
        />
      ))}
    </g>
  );
}

function OrangeGlowFilter({ id }: { readonly id: string }) {
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
      <feFlood floodColor="#ff4518" floodOpacity="0.94" result="orange-color" />
      <feComposite in="orange-color" in2="SourceAlpha" operator="in" result="orange-source" />
      <feFlood floodColor="#ffad61" floodOpacity="0.18" result="orange-core-color" />
      <feComposite in="orange-core-color" in2="SourceAlpha" operator="in" result="orange-hot-core" />
      <feGaussianBlur in="orange-source" stdDeviation="1.4" result="orange-near" />
      <feGaussianBlur in="orange-source" stdDeviation="4.8" result="orange-mid" />
      <feGaussianBlur in="orange-source" stdDeviation="9" result="orange-far" />
      <feComponentTransfer in="orange-near" result="orange-near-hot"><feFuncA type="linear" slope="1.55" /></feComponentTransfer>
      <feComponentTransfer in="orange-mid" result="orange-mid-soft"><feFuncA type="linear" slope="0.85" /></feComponentTransfer>
      <feComponentTransfer in="orange-far" result="orange-far-soft"><feFuncA type="linear" slope="0.42" /></feComponentTransfer>
      <feMerge><feMergeNode in="orange-far-soft" /><feMergeNode in="orange-mid-soft" /><feMergeNode in="orange-near-hot" /><feMergeNode in="orange-hot-core" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  );
}

function ResultRailGlowFilter({ id }: { readonly id: string }) {
  // Blur the rail's own color so a green/yellow result never inherits the orange halo.
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="near" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="4.8" result="mid" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="far" />
      <feComponentTransfer in="near" result="near-hot"><feFuncA type="linear" slope="1.55" /></feComponentTransfer>
      <feComponentTransfer in="mid" result="mid-soft"><feFuncA type="linear" slope="0.85" /></feComponentTransfer>
      <feComponentTransfer in="far" result="far-soft"><feFuncA type="linear" slope="0.42" /></feComponentTransfer>
      <feMerge><feMergeNode in="far-soft" /><feMergeNode in="mid-soft" /><feMergeNode in="near-hot" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  );
}

function NetworkGlowFilters() {
  // Flat polylines (e.g. BALTHASAR's horizontal shared edge) have a zero-height
  // bounding box, which collapses an objectBoundingBox filter region to nothing
  // and clips the whole stroke away. Pin the region in user units instead; it
  // must cover both layout viewBoxes (720x960 portrait, 1440x720 landscape).
  return (
    <>
      <filter id="green-glow" filterUnits="userSpaceOnUse" x="-200" y="-250" width="2000" height="1600"><feGaussianBlur stdDeviation="1.7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="red-glow" filterUnits="userSpaceOnUse" x="-200" y="-250" width="2000" height="1600"><feGaussianBlur stdDeviation="2.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="amber-glow" filterUnits="userSpaceOnUse" x="-200" y="-250" width="2000" height="1600"><feGaussianBlur stdDeviation="1.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </>
  );
}

function MagiTerminalGraphic(props: MagiTerminalGraphicProps) {
  const { t } = useTranslation();
  const preset = ANIME_ORIGINAL_LAYOUT_PRESETS[props.layoutMode];
  const isRunning = props.phase === 'transitioning' || props.phase === 'deliberation';
  const networkState = isRunning || props.phase === 'final' ? 'active' : 'compose';
  const networkTransform = resolveMagiNetworkPosition(preset.network, networkState);
  const accessibleSubject = props.subject.trim() || t('original.awaiting');
  const viewBox = `0 0 ${preset.viewBox.width} ${preset.viewBox.height}`;

  return (
    <div className="terminal-graphic" data-layout={props.layoutMode}>
      <svg aria-hidden="true" className="terminal-calibration-layer terminal-calibration-layer--left" viewBox={viewBox} preserveAspectRatio={preset.information.leftCalibrationPreserveAspectRatio}>
        <TerminalCalibration height={preset.viewBox.height} side="left" width={preset.viewBox.width} />
      </svg>
      <svg aria-hidden="true" className="terminal-calibration-layer terminal-calibration-layer--right" viewBox={viewBox} preserveAspectRatio={preset.information.rightCalibrationPreserveAspectRatio}>
        <TerminalCalibration height={preset.viewBox.height} side="right" width={preset.viewBox.width} />
      </svg>
      <svg aria-hidden="true" className="terminal-information-layer" viewBox={viewBox} preserveAspectRatio={preset.information.preserveAspectRatio}>
        <defs><OrangeGlowFilter id="orange-glow" /></defs>
        <g className="terminal-chrome">
          <TerminalHeader placement={preset.information.header} />
          <SystemData decision={props.decision} phase={props.phase} placement={preset.information.systemData} subject={props.subject} />
        </g>
        <MotionResult decision={props.decision} phase={props.phase} placement={preset.information.motion} subject={props.subject} />
      </svg>
      <svg aria-hidden="true" className="terminal-connection-layer" viewBox={viewBox} preserveAspectRatio={preset.information.connectionPreserveAspectRatio}>
        <defs><OrangeGlowFilter id="orange-glow-connection" /></defs>
        <g className="terminal-chrome">
          <ConnectionData decision={props.decision} phase={props.phase} placement={preset.information.connectionData} />
        </g>
      </svg>
      <svg className="terminal-network-layer" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label={`${t('original.terminal')}. ${t('history.subject')}: ${accessibleSubject}`}>
        <defs><NetworkGlowFilters /></defs>
        <MagiNetwork
          disabled={isRunning}
          onOpenConfig={props.onOpenConfig}
          scanning={isRunning}
          state={networkState}
          transform={networkTransform}
          votes={props.decision?.votes ?? DEFAULT_VOTES}
          names={Object.fromEntries(Object.entries(props.configs).map(([id, config]) => {
            const name = props.decision?.agentNames?.[config.agentId] ?? props.decision?.outputs?.[config.agentId]?.displayName ?? agentDisplayName(config, config.agentId);
            return [id, name === id ? undefined : name];
          }))}
        />
      </svg>
    </div>
  );
}

function MotionComposer({ collapsed, completed, error, isExecuting, subject, toolbar, onChange, onNewMotion, onSubmit }: {
  collapsed: boolean;
  completed: boolean;
  error: string | null;
  isExecuting: boolean;
  subject: string;
  toolbar: ReactNode;
  onChange: (value: string) => void;
  onNewMotion: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`motion-composer${collapsed ? ' is-collapsed' : ''}`}>
      <div className="motion-composer__header">
        {completed
          ? <button className="direct-link-new-motion" type="button" onClick={onNewMotion}>{t('original.newMotion')}</button>
          : <h2 className="motion-composer__heading">{t('original.newMotion')}</h2>}
        {toolbar}
      </div>
      {!collapsed ? (
        <form className="motion-composer__form" onSubmit={onSubmit}>
          <fieldset disabled={isExecuting}>
            <legend className="motion-composer__legend">{t('original.newMotion')}</legend>
            <label htmlFor="direct-link-motion">{t('original.agenda')}</label>
            <div className="motion-composer__controls">
              <div className="motion-composer__input">
                <span aria-hidden="true">&gt;</span>
                <TerminalMotionInput value={subject} onChange={onChange} placeholder={t('decision.agendaPlaceholder')} />
                <small>{subject.length} / 240</small>
              </div>
              <button type="submit">{t('original.execute')}</button>
            </div>
            {error ? <p className="motion-composer__error" role="alert">{error}</p> : null}
          </fieldset>
        </form>
      ) : null}
    </div>
  );
}

function DirectControlIcon({ name }: { name: 'history' | 'settings' | 'book' }) {
  const paths = {
    history: <><path d="M3 4v5h5" /><path d="M3.7 8a9 9 0 1 1-.4 7" /><path d="M12 7v5l3 2" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" /></>,
    book: <><path d="M12 5c-2-1.5-5-2-9-1v15c4-1 7-.5 9 1.5 2-2 5-2.5 9-1.5V4c-4-1-7-.5-9 1Z" /><path d="M12 5v15.5" /></>,
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function DecisionHomeAnimeOriginal({ service: suppliedService }: DecisionHomeAnimeOriginalProps = {}) {
  const { t } = useTranslation();
  const layoutMode = useAnimeOriginalLayoutMode();
  const [phase, setPhase] = useState<AnimeOriginalPhase>('compose');
  const [subject, setSubject] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runtime = useDecisionRuntime();
  const { configs, service: runtimeService, storageWarning } = runtime;
  const service = suppliedService ?? runtimeService;
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState(loadDecisionHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [archiveWarning, setArchiveWarning] = useState(false);
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


  function resetMotion() {
    activeController.current?.abort();
    activeController.current = null;
    setDecision(null);
    setSubject('');
    setError(null);
    setPhase('compose');
    setIsExecuting(false);
  }

  function openHistory() {
    if (!archiveWarning) setHistory(loadDecisionHistory());
    setHistoryOpen(true);
  }

  async function runDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isExecuting) return;
    const normalizedSubject = subject.trim();
    if (!normalizedSubject) {
      setError(t('original.emptyMotion'));
      setPhase('error');
      return;
    }

    setError(null);
    setDecision(null);
    setIsExecuting(true);
    setPhase('transitioning');
    activeController.current?.abort();

    const controller = new AbortController();
    activeController.current = controller;
    let polling: Promise<Decision> | null = null;

    try {
      await waitForTransition(controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      setPhase('deliberation');

      const options = { signal: controller.signal };
      const created = await service.createDecision({ subject: normalizedSubject, priority: 'normal' }, options);
      if (!mounted.current || controller.signal.aborted) return;
      setDecision(created);

      polling = pollDecisionUntilTerminal(service, created.id, {
        ...options,
        onDecision: (nextDecision) => { if (mounted.current) setDecision(nextDecision); },
      });
      const execution = await service.executeDecision(created.id, options);
      const completed = isTerminalDecision(execution) ? execution : await polling;
      controller.abort();
      await polling.catch(() => undefined);
      if (!mounted.current) return;
      setDecision(completed);
      {
        const entry = createDecisionHistoryEntry(completed, 'standard', [], configs);
        const next = prependDecisionHistory(archiveWarning ? history : loadDecisionHistory(), entry);
        setHistory(next);
        setArchiveWarning(!saveDecisionHistory(next));
      }
      setPhase(completed.status === 'failed' ? 'error' : 'final');
      if (completed.status === 'failed') setError(t('original.failed'));
    } catch (cause) {
      const shouldReport = mounted.current && activeController.current === controller;
      controller.abort();
      await polling?.catch(() => undefined);
      if (shouldReport) {
        setError(localizeError(cause, t));
        setPhase('error');
      }
    } finally {
      if (activeController.current === controller) activeController.current = null;
      if (mounted.current) setIsExecuting(false);
    }
  }

  const composerCollapsed = phase === 'transitioning' || phase === 'deliberation' || phase === 'final';

  return (
    <main className={`direct-link-page phase-${phase}`} data-layout={layoutMode} data-phase={phase}>
      <p className="direct-link-live-status" aria-live={phase === 'error' ? 'assertive' : 'polite'}>
        {animeOriginalStatus(phase, decision, error, t)}
      </p>
      <div className="direct-link-workspace">
        <section className="terminal-screen" aria-label={t('original.terminal')}>
          <MagiTerminalGraphic decision={decision} configs={configs} layoutMode={layoutMode} phase={phase} subject={subject} onOpenConfig={setSelectedAgentId} />
          {archiveWarning || storageWarning ? <p className="direct-history-warning" role="status">{t('original.storageWarning')}</p> : null}
        </section>
        <MotionComposer
          collapsed={composerCollapsed}
          completed={phase === 'final'}
          error={error}
          isExecuting={isExecuting}
          subject={subject}
          onNewMotion={resetMotion}
          toolbar={
            <nav className="direct-link-controls" aria-label={t('nav.label')}>
              <button className="direct-link-control-button direct-history-trigger" type="button" aria-label={t('common.history')} title={t('common.history')} aria-haspopup="dialog" onClick={openHistory}><DirectControlIcon name="history" /></button>
              <span className="direct-link-controls__separator" aria-hidden="true" />
              <RuntimeSettings
                runtime={runtime}
                selectedAgentId={selectedAgentId}
                onCloseNode={() => setSelectedAgentId(null)}
                variant="original"
                renderEntry={({ openOverall, openSettingBook }) => <>
                  <button className="direct-link-control-button" type="button" aria-label={t('nav.settings')} title={t('nav.settings')} onClick={openOverall}><DirectControlIcon name="settings" /></button>
                  <button className="direct-link-control-button" type="button" aria-label={t('common.settingBook')} title={t('common.settingBook')} onClick={openSettingBook}><DirectControlIcon name="book" /></button>
                </>}
              />
              <LanguageSelector variant="original" />
            </nav>
          }
          onChange={(value) => {
            setSubject(value);
            if (error) {
              setError(null);
              setPhase('compose');
            }
          }}
          onSubmit={(event) => void runDecision(event)}
        />
      </div>

      {historyOpen ? <HistoryArchive entries={history} onClose={() => setHistoryOpen(false)} /> : null}
    </main>
  );
}

const hotGlobal = globalThis as typeof globalThis & { __decisionHomeAnimeOriginalRoot?: ReturnType<typeof createRoot> };
const standaloneRoot = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-anime-original-root]');

if (standaloneRoot) {
  const root = hotGlobal.__decisionHomeAnimeOriginalRoot ?? createRoot(standaloneRoot);
  hotGlobal.__decisionHomeAnimeOriginalRoot = root;
  root.render(<DecisionHomeAnimeOriginal />);
}
