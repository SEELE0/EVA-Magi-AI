/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useState, type CSSProperties } from 'react';
import './bios-start.css';

type BiosPhase = 'power-on' | 'post' | 'ready' | 'exit';

const postLines = [
  'CPU                 : MAGI IU / 1.00GHz',
  'MEMORY TEST         : 524288K OK',
  'CACHE MEMORY        : 8192K OK',
  'PRIMARY MASTER      : MAGI MASS STORAGE SYSTEM   [OK]',
  'PRIMARY SLAVE       : MAGI OPTICAL DRIVE         [OK]',
  'DISPLAY ADAPTER     : NERV TERMINAL ADAPTER     [OK]',
  'NETWORK ADAPTER     : LINK STANDBY',
  'SYSTEM CONFIGURATION: NERV STANDARD CONFIG      [OK]'
];

const nodeLines = ['MELCHIOR-1     : ONLINE', 'BALTHASAR-2    : ONLINE', 'CASPER-3       : ONLINE'];

const logoUrl = new URL('./assets/nerv-logo-transparent.png', import.meta.url).href;

export function BiosStart() {
  const [phase, setPhase] = useState<BiosPhase>('power-on');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('post'), 680),
      window.setTimeout(() => setPhase('ready'), 4_650),
      window.setTimeout(() => setPhase('exit'), 5_850),
      window.setTimeout(() => setVisible(false), 6_350)
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  if (!visible) return null;

  return (
    <div className={`bios-start bios-start--${phase}`} aria-hidden="true">
      <div className="bios-start__screen" />
      <div className="bios-start__scanlines" />
      <div className="bios-start__vignette" />

      <main className="bios-start__console">
        <header className="bios-start__header">
          <div>MAGI COMMAND TERMINAL <span>VER. 3.14</span></div>
          <div>(C) 2026 MAGI. ALL RIGHTS RESERVED.</div>
          <div>SYSTEM BIOS 26.08.09&nbsp;&nbsp; MAGI-03</div>
        </header>

        <div className="bios-start__rule" />

        <section className="bios-start__post" aria-label="BIOS hardware self-test">
          {postLines.map((line, index) => (
            <div
              className="bios-start__line"
              key={line}
              style={{ '--bios-line-index': index } as CSSProperties}
            >
              {line}
            </div>
          ))}
        </section>

        <section className="bios-start__system-check">
          <div className="bios-start__check-title">MAGI SYSTEM CHECK ...</div>
          {nodeLines.map((line, index) => (
            <div
              className="bios-start__line bios-start__node-line"
              key={line}
              style={{ '--bios-node-index': index } as CSSProperties}
            >
              {line}
            </div>
          ))}
          <div className="bios-start__line bios-start__summary">THREE NODES SYNCHRONIZED.</div>
          <div className="bios-start__line bios-start__summary">AUTHORIZATION LEVEL : DIRECTOR</div>
          <div className="bios-start__line bios-start__summary">SECURITY CLEARANCE  : TOP SECRET</div>
        </section>

        <section className="bios-start__message-box">
          <div className="bios-start__message-logo">
            <img src={logoUrl} alt="" />
          </div>
          <div className="bios-start__message-copy">
            <div>GOD&apos;S IN HIS HEAVEN.</div>
            <div>ALL&apos;S RIGHT WITH THE WORLD.</div>
            <div className="bios-start__message-command">&gt; STARTING MAGI TERMINAL OS...</div>
          </div>
        </section>

        <div className="bios-start__prompt">A:\&gt; <span className="bios-start__cursor" /></div>
      </main>
    </div>
  );
}
