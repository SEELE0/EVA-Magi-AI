/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MAGI_BOOT_ANIMATION_DURATION_MS, MagiBoot } from '../magi-boot';
import './boot-intro.css';

export type BootPhase =
  | 'power-on'
  | 'post-header'
  | 'magi'
  | 'post-stream'
  | 'exit'
  | 'resync'
  | 'reveal';

interface BootSceneProps {
  phase: BootPhase;
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
/** Brief pause after START DECISION_CONSOLE before the first handoff row begins. */
export const READY_HOLD_MS = 500;
const EXIT_START_MS = MAGI_BOOT_COMPLETE_MS + READY_HOLD_MS;
/** Both handoff rows finish at 0.86s, leaving a short visible confirmation hold. */
export const HANDOFF_DURATION_MS = 1300;
/** A real mode switch reads as a short signal loss, not a polished cross-fade. */
export const RESYNC_BLANK_MS = 240;
const REVEAL_SETTLE_MS = 300;
const RESYNC_START_MS = EXIT_START_MS + HANDOFF_DURATION_MS;
const REVEAL_START_MS = RESYNC_START_MS + RESYNC_BLANK_MS;
const INTRO_HIDDEN_MS = REVEAL_START_MS + REVEAL_SETTLE_MS;
const SKIP_HIDDEN_MS = RESYNC_BLANK_MS + REVEAL_SETTLE_MS;

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
  exit: EXIT_START_MS,
  handoffDuration: HANDOFF_DURATION_MS,
  resync: RESYNC_START_MS,
  resyncBlank: RESYNC_BLANK_MS,
  reveal: REVEAL_START_MS,
  revealSettle: REVEAL_SETTLE_MS,
  skipHidden: SKIP_HIDDEN_MS,
  hidden: INTRO_HIDDEN_MS
} as const;

/** Cumulative rendering flags per phase; keep in sync with the data-boot-phase selectors in boot-intro.css. */
const BOOT_PHASE_FLAGS: Record<BootPhase, { post: boolean; magi: boolean; stream: boolean }> = {
  'power-on': { post: false, magi: false, stream: false },
  'post-header': { post: true, magi: false, stream: false },
  magi: { post: true, magi: true, stream: false },
  'post-stream': { post: true, magi: true, stream: true },
  exit: { post: true, magi: true, stream: true },
  resync: { post: true, magi: true, stream: true },
  reveal: { post: true, magi: true, stream: true }
};

const BOOT_PHASE_STEP: Record<BootPhase, string> = {
  'power-on': '00',
  'post-header': '01',
  magi: '02',
  'post-stream': '03',
  exit: '04',
  resync: '05',
  reveal: '06'
};

const BOOT_PHASE_LABEL: Record<BootPhase, string> = {
  'power-on': 'POWER ON',
  'post-header': 'POWER-ON SELF TEST',
  magi: 'INITIAL PROGRAM LOAD',
  'post-stream': 'SYSTEM READY',
  exit: 'DISPLAY DRIVER HANDOFF',
  resync: 'VIDEO RESYNCHRONIZATION',
  reveal: 'DECISION CONSOLE'
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

export function BootScene({ phase, onSkip }: BootSceneProps) {
  const flags = BOOT_PHASE_FLAGS[phase];
  const stage = useBootStageLayout();
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
                    ) : phase === 'exit' ? (
                      <span aria-hidden="true" className="boot-command-enter">[ENTER]</span>
                    ) : null}
                  </p>
                  {phase === 'exit' ? (
                    <div aria-label="正在切换至图形决策终端" className="boot-handoff-block">
                      <div className="boot-handoff-line" style={{ '--boot-line-index': 0 } as CSSProperties}>
                        <span>LOADING DISPLAY DRIVER</span><b>OK</b>
                      </div>
                      <div className="boot-handoff-line" style={{ '--boot-line-index': 1 } as CSSProperties}>
                        <span>MOUNTING MAGI PERSONALITY NODES</span><b>OK</b>
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

export function BootIntro({ onFinished }: BootIntroProps) {
  const [phase, setPhase] = useState<BootPhase>('power-on');
  const [visible, setVisible] = useState(shouldShowBootIntro);
  const [skipRequested, setSkipRequested] = useState(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!visible) {
      onFinishedRef.current?.();
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      markBootIntroAsPlayed();
      setVisible(false);
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timers: number[] = [];
    let ended = false;

    // Natural completion, explicit skip and tab-hide all funnel through here,
    // so the session flag is written exactly once, when the intro is over.
    const beginEnding = (skipHandoff = false) => {
      if (ended) return;
      ended = true;
      markBootIntroAsPlayed();
      timers.forEach((timer) => window.clearTimeout(timer));

      if (skipHandoff) {
        setPhase('resync');
        timers.push(
          window.setTimeout(() => setPhase('reveal'), RESYNC_BLANK_MS),
          window.setTimeout(() => setVisible(false), SKIP_HIDDEN_MS)
        );
        return;
      }

      setPhase('exit');
      timers.push(
        window.setTimeout(() => setPhase('resync'), HANDOFF_DURATION_MS),
        window.setTimeout(() => setPhase('reveal'), HANDOFF_DURATION_MS + RESYNC_BLANK_MS),
        window.setTimeout(() => setVisible(false), HANDOFF_DURATION_MS + RESYNC_BLANK_MS + REVEAL_SETTLE_MS)
      );
    };

    timers.push(
      window.setTimeout(() => setPhase('post-header'), POST_HEADER_START_MS),
      window.setTimeout(() => setPhase('magi'), MAGI_BOOT_START_MS),
      window.setTimeout(() => setPhase('post-stream'), MAGI_BOOT_COMPLETE_MS),
      window.setTimeout(() => beginEnding(false), EXIT_START_MS)
    );

    const skipOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        beginEnding(true);
      }
    };
    const skipOnHide = () => {
      if (document.visibilityState === 'hidden') beginEnding(true);
    };

    window.addEventListener('keydown', skipOnKey);
    document.addEventListener('visibilitychange', skipOnHide);

    if (skipRequested) beginEnding(true);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('keydown', skipOnKey);
      document.removeEventListener('visibilitychange', skipOnHide);
    };
  }, [skipRequested, visible]);

  if (!visible) return null;

  return <BootScene onSkip={() => setSkipRequested(true)} phase={phase} />;
}
