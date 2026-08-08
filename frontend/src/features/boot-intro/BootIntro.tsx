/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { useEffect, useState, type CSSProperties } from 'react';

type BootPhase = 'power-on' | 'post' | 'exit';

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
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('post'), 750),
      window.setTimeout(() => setPhase('exit'), 3350),
      window.setTimeout(() => setVisible(false), 3900)
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  if (!visible) return null;

  return (
    <div className={`boot-intro boot-${phase}`} aria-hidden="true">
      <div className="boot-power-stage">
        <div className="boot-power-screen" />
        <div className="boot-post-console">
          <div className="boot-post-access">
            <span>DIRECT LINK CONNECTION: MAGI_01</span>
            <strong>ACCESS MODE: SUPERUSER</strong>
          </div>
          <div className="boot-post-motion">
            <span>RESULT OF THE DELIBERATION</span>
            <strong>MOTION: SYSTEM INITIALIZATION</strong>
          </div>
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
        </div>
      </div>
      <div className="boot-scanlines" />
    </div>
  );
}
