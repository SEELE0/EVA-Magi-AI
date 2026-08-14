/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { MAGI_BOOT_ANIMATION_DURATION_MS, MagiBoot } from '../magi-boot';

type BootPhase = 'power-on' | 'post-header' | 'magi' | 'post-stream' | 'exit';

const POST_HEADER_START_MS = 750;
const MAGI_BOOT_START_MS = 1600;
const MAGI_BOOT_COMPLETE_MS = MAGI_BOOT_START_MS + MAGI_BOOT_ANIMATION_DURATION_MS + 300;
const EXIT_START_MS = MAGI_BOOT_COMPLETE_MS + 3000;
const INTRO_HIDDEN_MS = EXIT_START_MS + 1100;
const BOOT_INTRO_SESSION_KEY = 'magi-nerv:boot-intro-played';

function shouldShowBootIntro() {
  if (typeof window === 'undefined') return true;

  try {
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

const bootPostLines = [
  'CODE:258',
  'FILE:MAGI_SYS',
  'EXTENSION:60M',
  'MEMORY CHECK:640K OK',
  'MELCHIOR-1:CONNECTED',
  'BALTHASAR-2:CONNECTED',
  'CASPER-3:CONNECTED',
  'NEURAL LINK:SYNCHRONIZED'
];

export function BootIntro() {
  const [phase, setPhase] = useState<BootPhase>('power-on');
  const [visible, setVisible] = useState(shouldShowBootIntro);

  useEffect(() => {
    if (!visible) return;

    markBootIntroAsPlayed();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('post-header'), POST_HEADER_START_MS),
      window.setTimeout(() => setPhase('magi'), MAGI_BOOT_START_MS),
      window.setTimeout(() => setPhase('post-stream'), MAGI_BOOT_COMPLETE_MS),
      window.setTimeout(() => setPhase('exit'), EXIT_START_MS),
      window.setTimeout(() => setVisible(false), INTRO_HIDDEN_MS)
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visible]);

  if (!visible) return null;

  const postStarted = phase !== 'power-on';
  const magiStarted = phase === 'magi' || phase === 'post-stream' || phase === 'exit';
  const streamStarted = phase === 'post-stream' || phase === 'exit';
  const className = [
    'boot-intro',
    `boot-phase-${phase}`,
    postStarted ? 'boot-post' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={className} aria-hidden="true">
      <div className="boot-power-stage">
        <div className="boot-power-screen" />
        <div className="boot-post-console">
          <div className="boot-post-header">
            <div className="boot-post-access">
              <span>DIRECT LINK CONNECTION: MAGI_01</span>
              <strong>ACCESS MODE: SUPERUSER</strong>
            </div>
            <div className="boot-post-motion">
              <span>RESULT OF THE DELIBERATION</span>
              <strong>MOTION: SYSTEM INITIALIZATION</strong>
            </div>
          </div>
          <div className="boot-post-body">
            <div className="boot-magi-slot">
              {magiStarted ? (
                <MagiBoot
                  background="transparent"
                  className="boot-magi-module"
                  interactive={false}
                  showCrtEffects={false}
                  size="min(72vw, 55vh, 420px)"
                />
              ) : null}
            </div>
            <div className="boot-post-stream-slot">
              {streamStarted ? (
                <div className="boot-post-stream">
                  {bootPostLines.map((line, index) => (
                    <span key={line} style={{ '--boot-line-index': index } as CSSProperties}>
                      {line}
                    </span>
                  ))}
                  <span className="boot-post-ready">
                    MAGI SYSTEM: READY<span className="boot-post-cursor">_</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="boot-scanlines" />
      <div className="boot-exit-curtain" />
    </div>
  );
}
