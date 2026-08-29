/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { AgentId, Decision } from '../../domain/decision';
import { createDecisionService } from '../../services/create-decision-service';
import type { DecisionService } from '../../services/decision-service';
import { isTerminalDecision, pollDecisionUntilTerminal } from '../../services/poll-decision';
import { AgentConfigDialog } from '../decision-home/AgentConfigDialog';
import { cloneAgentConfigs } from '../decision-home/simulator-config';
import type { AgentConfigMap, AgentRuntimeConfig } from '../decision-home/simulator-types';
import {
  CONNECTION_DATA_LINES,
  DIRECT_LINK_LAYOUT_PRESETS,
  SYSTEM_DATA_LINES,
  TERMINAL_MODULE_LAYOUT,
  toSvgTranslate,
  type DirectLinkPanelPlacement,
  type DirectLinkLayoutMode,
} from './layout';
import { MagiNetwork } from './MagiNetwork';
import './magi-direct-link-test.css';

export type DirectLinkPhase = 'compose' | 'transitioning' | 'deliberation' | 'final' | 'error';

interface MagiDirectLinkTestProps {
  service?: DecisionService;
}

interface MagiTerminalGraphicProps {
  decision: Decision | null;
  layoutMode: DirectLinkLayoutMode;
  phase: DirectLinkPhase;
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
const defaultService = createDecisionService();

function subscribeToLayout(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const queries = [window.matchMedia(ORIENTATION_QUERY), window.matchMedia(WIDE_PORTRAIT_QUERY)];
  queries.forEach((query) => query.addEventListener('change', callback));
  return () => queries.forEach((query) => query.removeEventListener('change', callback));
}

function currentLayoutMode(): DirectLinkLayoutMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'portrait';
  if (window.matchMedia(ORIENTATION_QUERY).matches) return 'landscape';
  return window.matchMedia(WIDE_PORTRAIT_QUERY).matches ? 'portrait-wide' : 'portrait';
}

function useDirectLinkLayoutMode(): DirectLinkLayoutMode {
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

function motionLines(subject: string) {
  const normalized = subject.trim().replace(/\s+/g, ' ') || 'AWAITING INPUT';
  const takeByVisualUnits = (value: string, maximum: number) => {
    let units = 0;
    let index = 0;
    for (const character of value) {
      const nextUnits = /[\u3000-\u9fff\uf900-\ufaff]/.test(character) ? 2 : 1;
      if (units + nextUnits > maximum) break;
      units += nextUnits;
      index += character.length;
    }
    return [value.slice(0, index), value.slice(index)] as const;
  };
  const [first, remainder] = takeByVisualUnits(normalized, 18);
  if (!remainder) return [`MOTION : ${first}`];

  const [secondChunk, overflow] = takeByVisualUnits(remainder, 28);
  const second = overflow ? `${secondChunk}…` : secondChunk;
  return [`MOTION : ${first}`, second];
}

function TerminalHeader({ placement }: { readonly placement: DirectLinkPanelPlacement }) {
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

function MotionResult({ phase, placement, subject }: Pick<MagiTerminalGraphicProps, 'phase' | 'subject'> & { readonly placement: DirectLinkPanelPlacement }) {
  const layout = TERMINAL_MODULE_LAYOUT.motion;
  const secondRailX = layout.railWidth + layout.railGap;
  const rightRailX = placement.width - layout.railWidth;
  const rightSecondRailX = rightRailX - layout.railWidth - layout.railGap;
  const lines = motionLines(subject);
  const result = phase === 'compose' || phase === 'error'
    ? 'AWAITING MOTION'
    : phase === 'final'
      ? 'RESULT OF THE DELIBERATION'
      : 'DELIBERATION IN PROGRESS';

  return (
    <g className="terminal-orange motion-result" transform={toSvgTranslate(placement.origin)}>
      <title>{subject.trim() || '议题等待输入'}</title>
      <g className="motion-result__rails">
        <rect width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={secondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={rightSecondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={rightRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
      </g>
      <text x={layout.contentInset} y="27" className="motion-copy">{result}</text>
      <text x={layout.contentInset} y={lines.length === 1 ? 70 : 55} className="motion-title">
        {lines.map((line, index) => <tspan x={layout.contentInset} dy={index === 0 ? 0 : 24} key={line}>{line}</tspan>)}
      </text>
    </g>
  );
}

function SystemData({ placement }: { readonly placement: DirectLinkPanelPlacement }) {
  const layout = TERMINAL_MODULE_LAYOUT.systemData;
  return (
    <g className="terminal-orange system-data" transform={toSvgTranslate(placement.origin)}>
      {SYSTEM_DATA_LINES.map((line, index) => <text key={line} y={index * layout.lineHeight}>{line}</text>)}
    </g>
  );
}

function ConnectionData({ placement }: { readonly placement: DirectLinkPanelPlacement }) {
  return (
    <g className="terminal-orange connection-data" transform={toSvgTranslate(placement.origin)}>
      {CONNECTION_DATA_LINES.map((line) => (
        <text key={line.text} y={line.baseline} className={'small' in line ? 'connection-data__small' : undefined}>{line.text}</text>
      ))}
    </g>
  );
}

function OrangeGlowFilter() {
  return (
    <filter id="orange-glow" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
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

function NetworkGlowFilters() {
  return (
    <>
      <filter id="green-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="red-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="amber-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </>
  );
}

function MagiTerminalGraphic(props: MagiTerminalGraphicProps) {
  const preset = DIRECT_LINK_LAYOUT_PRESETS[props.layoutMode];
  const isRunning = props.phase === 'transitioning' || props.phase === 'deliberation';
  const networkState = isRunning || props.phase === 'final' ? 'active' : 'compose';
  const accessibleSubject = props.subject.trim() || '等待输入议题';
  const viewBox = `0 0 ${preset.viewBox.width} ${preset.viewBox.height}`;

  return (
    <div className="terminal-graphic" data-layout={props.layoutMode}>
      <svg aria-hidden="true" className="terminal-information-layer" viewBox={viewBox} preserveAspectRatio={preset.information.preserveAspectRatio}>
        <defs><OrangeGlowFilter /></defs>
        <g className="terminal-chrome">
          <TerminalHeader placement={preset.information.header} />
          <SystemData placement={preset.information.systemData} />
          <ConnectionData placement={preset.information.connectionData} />
        </g>
        <MotionResult phase={props.phase} placement={preset.information.motion} subject={props.subject} />
      </svg>
      <svg className="terminal-network-layer" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`MAGI direct link deliberation terminal. Motion: ${accessibleSubject}`}>
        <defs><NetworkGlowFilters /></defs>
        <MagiNetwork
          disabled={isRunning}
          onOpenConfig={props.onOpenConfig}
          position={preset.network}
          scanning={isRunning}
          state={networkState}
          votes={props.decision?.votes ?? DEFAULT_VOTES}
        />
      </svg>
    </div>
  );
}

function MotionComposer({ collapsed, error, isExecuting, subject, onChange, onSubmit }: {
  collapsed: boolean;
  error: string | null;
  isExecuting: boolean;
  subject: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form aria-hidden={collapsed || undefined} className={`motion-composer${collapsed ? ' is-collapsed' : ''}`} inert={collapsed || undefined} onSubmit={onSubmit}>
      <fieldset disabled={isExecuting}>
        <legend>NEW MOTION</legend>
        <label htmlFor="direct-link-motion">AGENDA</label>
        <div className="motion-composer__controls">
          <div className="motion-composer__input">
            <span aria-hidden="true">&gt;</span>
            <textarea id="direct-link-motion" value={subject} onChange={(event) => onChange(event.target.value)} maxLength={240} rows={2} placeholder="ENTER MOTION FOR DELIBERATION..." />
            <small>{subject.length} / 240</small>
          </div>
          <button type="submit">EXECUTE MOTION</button>
        </div>
        {error ? <p className="motion-composer__error" role="alert">{error}</p> : null}
      </fieldset>
    </form>
  );
}

export function MagiDirectLinkTest({ service = defaultService }: MagiDirectLinkTestProps = {}) {
  const layoutMode = useDirectLinkLayoutMode();
  const [phase, setPhase] = useState<DirectLinkPhase>('compose');
  const [subject, setSubject] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<AgentConfigMap>(() => cloneAgentConfigs());
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
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

  function saveAgentConfig(config: AgentRuntimeConfig) {
    setConfigs((current) => ({ ...current, [config.agentId]: config }));
  }

  function resetMotion() {
    activeController.current?.abort();
    activeController.current = null;
    setDecision(null);
    setSubject('');
    setError(null);
    setPhase('compose');
    setIsExecuting(false);
  }

  async function runDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isExecuting) return;
    const normalizedSubject = subject.trim();
    if (!normalizedSubject) {
      setError('MAGIに送信する議題を入力してください。');
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
      const created = await service.createDecision({ subject: normalizedSubject, priority: 'normal', simulationHint: 'standard' }, options);
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
      setPhase(completed.status === 'failed' ? 'error' : 'final');
      if (completed.status === 'failed') setError('MAGI 判定が失敗しました。入力内容を確認して再試行してください。');
    } catch (cause) {
      const shouldReport = mounted.current && activeController.current === controller;
      controller.abort();
      await polling?.catch(() => undefined);
      if (shouldReport) {
        setError(cause instanceof Error ? cause.message : '判定回線に障害が発生しました。');
        setPhase('error');
      }
    } finally {
      if (activeController.current === controller) activeController.current = null;
      if (mounted.current) setIsExecuting(false);
    }
  }

  const composerCollapsed = phase === 'transitioning' || phase === 'deliberation' || phase === 'final';
  const selectedAgentConfig = selectedAgentId ? configs[selectedAgentId] : null;

  return (
    <main className={`direct-link-page phase-${phase}`} data-layout={layoutMode} data-phase={phase}>
      <div className="direct-link-workspace">
        <section className="terminal-screen" aria-label="MAGI direct link terminal screen">
          <MagiTerminalGraphic decision={decision} layoutMode={layoutMode} phase={phase} subject={subject} onOpenConfig={setSelectedAgentId} />
          {phase === 'final' ? <button className="direct-link-new-motion" type="button" onClick={resetMotion}>NEW MOTION</button> : null}
        </section>
        <MotionComposer
          collapsed={composerCollapsed}
          error={error}
          isExecuting={isExecuting}
          subject={subject}
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

      <AgentConfigDialog config={selectedAgentConfig} onClose={() => setSelectedAgentId(null)} onSave={saveAgentConfig} variant="original" />
    </main>
  );
}

const hotGlobal = globalThis as typeof globalThis & { __magiDirectLinkRoot?: ReturnType<typeof createRoot> };
const standaloneRoot = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-magi-direct-link-root]');

if (standaloneRoot) {
  const root = hotGlobal.__magiDirectLinkRoot ?? createRoot(standaloneRoot);
  hotGlobal.__magiDirectLinkRoot = root;
  root.render(<MagiDirectLinkTest />);
}
