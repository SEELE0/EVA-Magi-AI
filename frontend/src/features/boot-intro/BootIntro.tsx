/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_HOME_MODE, type HomeMode } from '../../domain/home-mode';
import { MAGI_BOOT_ANIMATION_DURATION_MS, MagiBoot } from '../magi-boot';
import './boot-intro.css';

export type BootPhase =
  | 'power-on'
  | 'post-header'
  | 'magi'
  | 'post-stream'
  | 'mode-select'
  | 'exit'
  | 'resync'
  | 'reveal';

interface BootSceneProps {
  phase: BootPhase;
  animationSkipped?: boolean;
  selectedMode?: HomeMode;
  onModeChange?: (mode: HomeMode) => void;
  onModeConfirm?: () => void;
  onSkip?: () => void;
}

export type BootStageMode = 'landscape' | 'portrait';

interface BootStageLayout {
  mode: BootStageMode;
  width: number;
  height: number;
  scale: number;
}

export interface BootIntroProps {
  /** The initially highlighted homepage, usually restored from this tab's session. */
  initialMode?: HomeMode;
  /** Fired only after the user explicitly confirms a mode. */
  onModeSelected?: (mode: HomeMode) => void;
  /**
   * Fired once the intro is over — completed, skipped, or not played at all —
   * so the shell can restore interactivity of the app underneath.
   */
  onFinished?: () => void;
}

const POST_HEADER_START_MS = 1050;
const MAGI_BOOT_START_MS = 3200;
const BOOT_MAGI_TIME_SCALE = 0.65;
const MAGI_BOOT_COMPLETE_MS = Math.round(
  MAGI_BOOT_START_MS + MAGI_BOOT_ANIMATION_DURATION_MS * BOOT_MAGI_TIME_SCALE + 100
);
/** Brief pause after START DECISION_CONSOLE before the selector becomes available. */
export const READY_HOLD_MS = 500;
const MODE_SELECT_START_MS = MAGI_BOOT_COMPLETE_MS + READY_HOLD_MS;
/** Both handoff rows finish at 0.86s, leaving a short visible confirmation hold. */
export const HANDOFF_DURATION_MS = 1300;
/** A real mode switch reads as a short signal loss, not a polished cross-fade. */
export const RESYNC_BLANK_MS = 240;
const REVEAL_SETTLE_MS = 300;
const CONFIRMED_HIDDEN_MS = HANDOFF_DURATION_MS + RESYNC_BLANK_MS + REVEAL_SETTLE_MS;

export const BOOT_INTRO_SESSION_KEY = 'magi-nerv:boot-intro-played';
const BOOT_REPLAY_PARAM = 'boot';
const BOOT_REPLAY_VALUE = 'replay';

export const BOOT_STAGE_PRESETS = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 640, height: 1136 }
} as const;

const BOOT_STAGE_MAX_SCALE = 1.25;

export function getBootStageLayout(viewportWidth: number, viewportHeight: number): BootStageLayout {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const mode: BootStageMode = safeWidth >= safeHeight ? 'landscape' : 'portrait';
  const preset = BOOT_STAGE_PRESETS[mode];
  const inset = Math.max(8, Math.min(24, Math.min(safeWidth, safeHeight) * 0.025));
  const availableWidth = Math.max(1, safeWidth - inset * 2);
  const availableHeight = Math.max(1, safeHeight - inset * 2);
  const fittedScale = Math.max(0.1, Math.min(
    BOOT_STAGE_MAX_SCALE,
    availableWidth / preset.width,
    availableHeight / preset.height
  ));
  const scale = Number(fittedScale.toFixed(4));

  return {
    mode,
    // The preset is a minimum design surface, not a fixed aspect ratio. The
    // unconstrained axis expands in logical pixels so the scaled stage fills
    // every viewport without per-device breakpoints or letterboxing.
    width: Number((availableWidth / scale).toFixed(4)),
    height: Number((availableHeight / scale).toFixed(4)),
    scale
  };
}

function readBootViewport(): BootStageLayout {
  if (typeof window === 'undefined') return getBootStageLayout(1280, 720);

  const viewport = window.visualViewport;
  return getBootStageLayout(
    viewport?.width ?? window.innerWidth,
    viewport?.height ?? window.innerHeight
  );
}

function useBootStageLayout() {
  const [layout, setLayout] = useState<BootStageLayout>(readBootViewport);

  useEffect(() => {
    const updateLayout = () => {
      const next = readBootViewport();
      setLayout((current) => (
        current.mode === next.mode
          && current.width === next.width
          && current.height === next.height
          && current.scale === next.scale
          ? current
          : next
      ));
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
    };
  }, []);

  return layout;
}

/** Exposed for tests; the derived checkpoints must stay consistent with the constants above. */
export const BOOT_SCHEDULE_MS = {
  postHeader: POST_HEADER_START_MS,
  magi: MAGI_BOOT_START_MS,
  postStream: MAGI_BOOT_COMPLETE_MS,
  readyHold: READY_HOLD_MS,
  modeSelect: MODE_SELECT_START_MS,
  handoffDuration: HANDOFF_DURATION_MS,
  resyncBlank: RESYNC_BLANK_MS,
  revealSettle: REVEAL_SETTLE_MS,
  confirmedHidden: CONFIRMED_HIDDEN_MS
} as const;

/** Cumulative rendering flags per phase; keep in sync with the data-boot-phase selectors in boot-intro.css. */
const BOOT_PHASE_FLAGS: Record<BootPhase, { post: boolean; magi: boolean; stream: boolean }> = {
  'power-on': { post: false, magi: false, stream: false },
  'post-header': { post: true, magi: false, stream: false },
  magi: { post: true, magi: true, stream: false },
  'post-stream': { post: true, magi: true, stream: true },
  'mode-select': { post: true, magi: true, stream: true },
  exit: { post: true, magi: true, stream: true },
  resync: { post: true, magi: true, stream: true },
  reveal: { post: true, magi: true, stream: true }
};

const BOOT_PHASE_STEP: Record<BootPhase, string> = {
  'power-on': '00',
  'post-header': '01',
  magi: '02',
  'post-stream': '03',
  'mode-select': '04',
  exit: '05',
  resync: '06',
  reveal: '07'
};

const BOOT_PHASE_LABEL: Record<BootPhase, string> = {
  'power-on': 'POWER ON',
  'post-header': 'POWER-ON SELF TEST',
  magi: 'INITIAL PROGRAM LOAD',
  'post-stream': 'SYSTEM READY',
  'mode-select': 'DISPLAY MODE SELECTION',
  exit: 'DISPLAY DRIVER HANDOFF',
  resync: 'VIDEO RESYNCHRONIZATION',
  reveal: 'SELECTED INTERFACE'
};

export function shouldShowBootIntro() {
  if (typeof window === 'undefined') return true;

  try {
    if (new URLSearchParams(window.location.search).get(BOOT_REPLAY_PARAM) === BOOT_REPLAY_VALUE) {
      return true;
    }
    return window.sessionStorage.getItem(BOOT_INTRO_SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

function markBootIntroAsPlayed() {
  try {
    window.sessionStorage.setItem(BOOT_INTRO_SESSION_KEY, '1');
  } catch {
    // Storage can be unavailable in restricted browser contexts; the intro still works normally.
  }
}

const bootNodes = [
  { address: '0100', name: 'MELCHIOR-1', role: 'SCIENTIST / LOGIC' },
  { address: '0101', name: 'BALTHASAR-2', role: 'MOTHER / PROTECTION' },
  { address: '0102', name: 'CASPER-3', role: 'WOMAN / INSTINCT' }
];

const firmwareChecks = [
  { address: '0000', label: 'SYSTEM MEMORY', value: '65536K', state: 'OK' },
  { address: '0001', label: 'DISPLAY ADAPTER', value: 'CRT 3279', state: 'OK' },
  { address: '0002', label: 'TERMINAL ADDRESS', value: '00-01', state: 'OK' },
  { address: '0003', label: 'DIRECT ACCESS LINK', value: 'MAGI_01', state: 'ESTABLISHED' }
];

const homeModeOptions: ReadonlyArray<{
  mode: HomeMode;
  code: string;
  title: string;
  detail: string;
}> = [
  {
    mode: 'original',
    code: '01',
    title: 'ORIGINAL / DIRECT LINK',
    detail: 'MAGI DIRECT LINK CONNECTION'
  },
  {
    mode: 'modern',
    code: '02',
    title: 'MODERN / DECISION HOME',
    detail: 'MAGI DECISION INTERFACE'
  }
];

export function BootScene({
  phase,
  animationSkipped = false,
  selectedMode = DEFAULT_HOME_MODE,
  onModeChange,
  onModeConfirm,
  onSkip
}: BootSceneProps) {
  const flags = BOOT_PHASE_FLAGS[phase];
  const stage = useBootStageLayout();
  const selectedOption = homeModeOptions.find((option) => option.mode === selectedMode)
    ?? homeModeOptions[0];
  const className = ['boot-intro', flags.post ? 'boot-post' : '']
    .filter(Boolean)
    .join(' ');
  const sceneStyle = {
    '--boot-resync-blank-ms': `${RESYNC_BLANK_MS}ms`,
    '--boot-stage-width': `${stage.width}px`,
    '--boot-stage-height': `${stage.height}px`,
    '--boot-stage-scale': stage.scale
  } as CSSProperties;

  return (
    <div
      aria-label="MAGI 系统启动"
      aria-modal="true"
      className={className}
      data-boot-layout={stage.mode}
      data-boot-phase={phase}
      role="dialog"
      style={sceneStyle}
    >
      <div className="boot-power-stage">
        <div className="boot-power-screen" />
        <div className="boot-stage-viewport">
          <div className="boot-stage-canvas">
            <div className="boot-post-console">
          <header className="boot-terminal-header">
            <div className="boot-machine-mark">
              <strong>MAGI/01</strong>
              <span>PERSONAL COMPUTER</span>
            </div>
            <div className="boot-ipl-register">
              <span>MAGI SYSTEM UNIT · TYPE M-01</span>
              <strong>IPL {BOOT_PHASE_STEP[phase]}00</strong>
            </div>
          </header>

          <main className="boot-terminal-body">
            <section aria-live="polite" className="boot-transcript">
              <p className="boot-firmware-title">MAGI BASIC Decision-making SYSTEM</p>
              <p className="boot-copyright">COPYRIGHT (C) NERV</p>

              <div className="boot-terminal-batch boot-firmware-checks">
                {firmwareChecks.map((check, index) => (
                  <div
                    className="boot-terminal-line"
                    key={check.address}
                    style={{ '--boot-line-index': index } as CSSProperties}
                  >
                    <span className="boot-address">{check.address}</span>
                    <span className="boot-check-name">{check.label}</span>
                    <span className="boot-check-value">{check.value}</span>
                    <b>{check.state}</b>
                  </div>
                ))}
              </div>

              {flags.magi ? (
                <div className="boot-terminal-batch boot-ipl-batch">
                  <p className="boot-command">&gt; IPL 00C0,MAGI_EXEC</p>
                  <p className="boot-loader-copy">LOADING PERSONALITY MATRIX...</p>
                  {bootNodes.map((node, index) => (
                    <div
                      className={`boot-terminal-line boot-node-row ${flags.stream ? 'is-online' : 'is-waiting'}`}
                      key={node.name}
                      style={{ '--boot-line-index': index } as CSSProperties}
                    >
                      <span className="boot-address">{node.address}</span>
                      <span className="boot-check-name">
                        {node.name}<small>{node.role}</small>
                      </span>
                      <span className="boot-check-value">CHANNEL {index + 1}</span>
                      <b aria-label={flags.stream ? 'ONLINE' : 'WAITING'}>
                        {flags.stream ? 'ONLINE' : (
                          <>
                            <span aria-hidden="true" className="boot-wait-marker">&gt;</span>
                            <span>WAIT</span>
                            <span aria-hidden="true" className="boot-wait-dots" />
                          </>
                        )}
                      </b>
                    </div>
                  ))}
                </div>
              ) : null}

              {flags.stream ? (
                <div className="boot-ready-block">
                  <p>THREE INDEPENDENT SYSTEMS ONLINE</p>
                  <strong>MAGI SYSTEM READY</strong>
                  <p className="boot-command boot-final-command">
                    A:\&gt; START DECISION_CONSOLE
                    {phase === 'post-stream' ? (
                      <span aria-hidden="true" className="boot-block-cursor" />
                    ) : phase === 'mode-select' || phase === 'exit' ? (
                      <span aria-hidden="true" className="boot-command-enter">[ENTER]</span>
                    ) : null}
                  </p>
                  {phase === 'mode-select' ? (
                    <div className="boot-mode-selector">
                      <p className="boot-mode-selector__title">SELECT DISPLAY MODE</p>
                      <div aria-label="选择主页显示模式" className="boot-mode-options" role="radiogroup">
                        {homeModeOptions.map((option) => {
                          const selected = option.mode === selectedMode;
                          return (
                            <button
                              aria-checked={selected}
                              className={`boot-mode-option${selected ? ' is-selected' : ''}`}
                              key={option.mode}
                              onClick={() => onModeChange?.(option.mode)}
                              role="radio"
                              type="button"
                            >
                              <span aria-hidden="true" className="boot-mode-cursor">{selected ? '>' : '\u00a0'}</span>
                              <span className="boot-mode-code">{option.code}</span>
                              <strong>{option.title}</strong>
                              <small>{option.detail}</small>
                            </button>
                          );
                        })}
                      </div>
                      <div aria-label="使用上下键选择，按回车键确认模式" className="boot-mode-help boot-mode-help--keyboard">
                        <span><kbd>↑</kbd> / <kbd>↓</kbd> SELECT</span>
                        <i aria-hidden="true">|</i>
                        <span>PRESS <kbd>ENTER</kbd> TO CHOOSE MODE</span>
                      </div>
                      <div aria-label="点击选项进行选择" className="boot-mode-help boot-mode-help--touch">
                        <span>TAP AN OPTION TO SELECT</span>
                      </div>
                      <button
                        aria-label={`确认进入 ${selectedOption.title} 模式`}
                        className="boot-mode-confirm"
                        onClick={onModeConfirm}
                        type="button"
                      >
                        <span aria-hidden="true">&gt;</span>
                        <strong>CONFIRM {selectedOption.title}</strong>
                        <kbd>[ENTER]</kbd>
                      </button>
                    </div>
                  ) : null}
                  {phase === 'exit' ? (
                    <div aria-label="正在切换至图形决策终端" className="boot-handoff-block">
                      <div className="boot-handoff-line" style={{ '--boot-line-index': 0 } as CSSProperties}>
                        <span>
                          {selectedMode === 'original'
                            ? 'LOADING DIRECT LINK DISPLAY DRIVER'
                            : 'LOADING DECISION HOME DISPLAY DRIVER'}
                        </span><b>OK</b>
                      </div>
                      <div className="boot-handoff-line" style={{ '--boot-line-index': 1 } as CSSProperties}>
                        <span>MOUNTING SELECTED INTERFACE</span><b>OK</b>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className="boot-magi-slot">
              {flags.magi ? (
                <>
                  <span className="boot-coprocessor-label">COPROCESSOR DISPLAY</span>
                  <MagiBoot
                    animationComplete={animationSkipped}
                    background="transparent"
                    className="boot-magi-module"
                    interactive={false}
                    showCrtEffects={false}
                    animationTimeScale={BOOT_MAGI_TIME_SCALE}
                    size="min(100%, 430px)"
                  />
                  <span className={`boot-coprocessor-state${flags.stream ? ' is-online' : ''}`}>
                    {flags.stream ? 'ONLINE' : 'EXECUTING'}
                  </span>
                </>
              ) : null}
            </div>
          </main>

              <footer className="boot-terminal-footer" aria-label={`启动阶段：${BOOT_PHASE_LABEL[phase]}`}>
                <span>KEYBOARD LOCK: OFF</span>
                <strong>{BOOT_PHASE_LABEL[phase]}</strong>
                <button className="boot-skip" onClick={onSkip} type="button">
                  <kbd>ESC</kbd>
                  <span>BYPASS AUTO-IPL</span>
                </button>
              </footer>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="boot-scanlines" />
      <div aria-hidden="true" className="boot-exit-curtain" />
    </div>
  );
}

export function BootIntro({
  initialMode = DEFAULT_HOME_MODE,
  onModeSelected,
  onFinished
}: BootIntroProps) {
  const [phase, setPhase] = useState<BootPhase>('power-on');
  const [visible, setVisible] = useState(shouldShowBootIntro);
  const [animationSkipped, setAnimationSkipped] = useState(false);
  const [selectedMode, setSelectedMode] = useState<HomeMode>(initialMode);
  const phaseRef = useRef(phase);
  const selectedModeRef = useRef(selectedMode);
  const skipToModeSelectRef = useRef<() => void>(() => undefined);
  const confirmModeRef = useRef<() => void>(() => undefined);
  const onModeSelectedRef = useRef(onModeSelected);
  const onFinishedRef = useRef(onFinished);

  phaseRef.current = phase;
  selectedModeRef.current = selectedMode;

  useEffect(() => {
    onModeSelectedRef.current = onModeSelected;
    onFinishedRef.current = onFinished;
  }, [onFinished, onModeSelected]);

  useEffect(() => {
    if (!visible) {
      onFinishedRef.current?.();
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timers: number[] = [];
    let ended = false;

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.length = 0;
    };

    // Skipping means fast-forwarding to the required choice, never bypassing it.
    const showModeSelector = () => {
      if (ended || phaseRef.current === 'mode-select') return;
      clearTimers();
      setAnimationSkipped(true);
      phaseRef.current = 'mode-select';
      setPhase('mode-select');
    };
    skipToModeSelectRef.current = showModeSelector;

    // Only a confirmed mode choice completes the intro and records the session.
    const beginEnding = () => {
      if (ended) return;
      ended = true;
      markBootIntroAsPlayed();
      clearTimers();

      setPhase('exit');
      timers.push(
        window.setTimeout(() => setPhase('resync'), HANDOFF_DURATION_MS),
        window.setTimeout(() => setPhase('reveal'), HANDOFF_DURATION_MS + RESYNC_BLANK_MS),
        window.setTimeout(() => setVisible(false), HANDOFF_DURATION_MS + RESYNC_BLANK_MS + REVEAL_SETTLE_MS)
      );
    };

    const confirmMode = () => {
      if (ended || phaseRef.current !== 'mode-select') return;
      onModeSelectedRef.current?.(selectedModeRef.current);
      beginEnding();
    };
    confirmModeRef.current = confirmMode;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showModeSelector();
    } else {
      timers.push(
        window.setTimeout(() => setPhase('post-header'), POST_HEADER_START_MS),
        window.setTimeout(() => setPhase('magi'), MAGI_BOOT_START_MS),
        window.setTimeout(() => setPhase('post-stream'), MAGI_BOOT_COMPLETE_MS),
        window.setTimeout(() => setPhase('mode-select'), MODE_SELECT_START_MS)
      );
    }

    const skipOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        showModeSelector();
        return;
      }

      if (phaseRef.current !== 'mode-select') return;

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const nextMode = selectedModeRef.current === 'original' ? 'modern' : 'original';
        selectedModeRef.current = nextMode;
        setSelectedMode(nextMode);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        confirmMode();
      }
    };
    const skipOnHide = () => {
      if (document.visibilityState === 'hidden') showModeSelector();
    };

    window.addEventListener('keydown', skipOnKey);
    document.addEventListener('visibilitychange', skipOnHide);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      skipToModeSelectRef.current = () => undefined;
      confirmModeRef.current = () => undefined;
      clearTimers();
      window.removeEventListener('keydown', skipOnKey);
      document.removeEventListener('visibilitychange', skipOnHide);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <BootScene
      animationSkipped={animationSkipped}
      onModeChange={(mode) => {
        selectedModeRef.current = mode;
        setSelectedMode(mode);
      }}
      onModeConfirm={() => confirmModeRef.current()}
      onSkip={() => skipToModeSelectRef.current()}
      phase={phase}
      selectedMode={selectedMode}
    />
  );
}
