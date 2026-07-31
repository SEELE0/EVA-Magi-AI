import { useEffect, useState, type CSSProperties } from 'react';

type BootPhase = 'idle' | 'text-reveal' | 'logo-hold' | 'logo-fade' | 'power-on' | 'post' | 'exit';

const bootImageUrl = new URL('../../../asset/images.jpeg', import.meta.url).href;

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
  const [phase, setPhase] = useState<BootPhase>('idle');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase('text-reveal'), 700),
      window.setTimeout(() => setPhase('logo-hold'), 2000),
      window.setTimeout(() => setPhase('logo-fade'), 2450),
      window.setTimeout(() => setPhase('power-on'), 3000),
      window.setTimeout(() => setPhase('post'), 3750),
      window.setTimeout(() => setPhase('exit'), 6350),
      window.setTimeout(() => setVisible(false), 6900)
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  if (!visible) return null;

  return (
    <div className={`boot-intro boot-${phase}`} aria-hidden="true">
      <div className="boot-logo-sequence">
        <div className="boot-art">
          <img className="boot-art-leaf boot-art-leaf-base" src={bootImageUrl} alt="" />
          <img className="boot-art-text boot-art-text-base" src={bootImageUrl} alt="" />
        </div>
      </div>
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
