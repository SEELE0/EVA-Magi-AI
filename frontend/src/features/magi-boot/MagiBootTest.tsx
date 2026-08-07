import { useState, type CSSProperties, type KeyboardEvent } from 'react';

const rings = [
  { radius: 118},
  { radius: 150},
  { radius: 182},
  { radius: 214},
  { radius: 246},
  { radius: 278},
  { radius: 310 }
];

const branches = [
  { id: 'balthasar', name: 'BALTHASAR-2', rotation: 0, delay: 5500 },
  { id: 'melchior', name: 'MELCHIOR-1', rotation: -120, delay: 5500 },
  { id: 'casper', name: 'CASPER-3', rotation: 120, delay: 5500 }
];

const branchSections = [
  { label: 'CEREBRUM', width: 68 },
  { label: 'CEREBELLUM', width: 82 },
  { label: 'CALLOSUM', width: 66 },
  { label: 'OBLONGATE', width: 76 }
];

const ringCenter = { x: 322, y: 323 };

export default function MagiBootTest() {
  const [seed, setSeed] = useState(0);

  function restart() {
    setSeed((value) => value + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      restart();
    }
  }

  return (
    <main className="boot-test-app">
      <div
        className="magi-stage"
        key={seed}
        data-testid="magi-stage"
        role="button"
        tabIndex={0}
        aria-label="MAGI 启动几何动画，点击重新播放"
        title="点击重新播放"
        onClick={restart}
        onKeyDown={handleKeyDown}
      >
        <svg
          className="magi-geometry"
          viewBox="0 0 720 720"
          role="img"
          aria-label="MAGI 启动几何：核心倒三角、同心圆、层级数字与三个人格平行四边形依次绘制"
        >
          <defs>
            <linearGradient
              id="ring-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="650"
              x2="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#ff5102" />
              <stop offset="27%" stopColor="#ff6a02" />
              <stop offset="49%" stopColor="#ffcf2e" />
              <stop offset="72%" stopColor="#9fbd4a" />
              <stop offset="100%" stopColor="#2c9561" />
            </linearGradient>
            <clipPath id="branch-name-clip" clipPathUnits="userSpaceOnUse">
              <polygon points="435,288 464,288 390,412 363,412" />
            </clipPath>
            <clipPath id="branch-sections-clip" clipPathUnits="userSpaceOnUse">
              <polygon points="468,288 643,288 570,412 395,412" />
            </clipPath>
            <clipPath id="core-copy-clip" clipPathUnits="userSpaceOnUse">
              <polygon points="290,290 430,290 360,409" />
            </clipPath>
          </defs>

          <g className="ring-layer">
            {rings.map((ring, index) => {
              // const labelDelay = 1450 + index * 150;
              const ringDelay = 1000 + index * 560;

              return (
                <g key={ring.radius}>
                  <circle
                    className="ring-trace"
                    cx={ringCenter.x}
                    cy={ringCenter.y}
                    r={ring.radius}
                    pathLength="1"
                    style={{ '--delay': `${ringDelay}ms` } as CSSProperties}
                  />
                </g>
              );
            })}
          </g>

          {/*<g className="hierarchy-layer" aria-label="层级 2 到 6">*/}
          {/*  {[6, 5, 4, 3, 2].map((level, index) => (*/}
          {/*    <text*/}
          {/*      key={level}*/}
          {/*      className="hierarchy-number"*/}
          {/*      x={98 + index * 32}*/}
          {/*      y="367"*/}
          {/*      style={{ '--delay': `${6420 + index * 115}ms` } as CSSProperties}*/}
          {/*    >*/}
          {/*      {level}*/}
          {/*    </text>*/}
          {/*  ))}*/}
          {/*</g>*/}

          <g transform="matrix(1.24 0 0 1.24 -124.4 -84.88)">
            <g className="persona-layer">
              {branches.map((branch) => (
                <g
                  className="persona-branch"
                  key={branch.id}
                  style={{
                    '--delay': `${branch.delay}ms`,
                    '--node-delay': `${branch.delay + 2210}ms`
                  } as CSSProperties}
                  transform={`rotate(${branch.rotation} 360 328.67)`}
                >
                  <polygon className="branch-frame" points="434,286 646,286 572,414 360,414" />
                  <line className="branch-structure" x1="466" y1="286" x2="392" y2="414" />
                  <line className="branch-structure" x1="447.5" y1="318" x2="627.5" y2="318" />
                  <line className="branch-structure" x1="429" y1="350" x2="609" y2="350" />
                  <line className="branch-structure" x1="410.5" y1="382" x2="590.5" y2="382" />
                  <g clipPath="url(#branch-name-clip)">
                    <text
                      className="branch-name"
                      x="413"
                      y="350"
                      dominantBaseline="middle"
                      textLength={Math.min(110, branch.name.length * 7.2)}
                      lengthAdjust="spacingAndGlyphs"
                      transform="rotate(120 413 350)"
                    >
                      {branch.name}
                    </text>
                  </g>
                  <g clipPath="url(#branch-sections-clip)">
                    {branchSections.map((section, index) => (
                      <text
                        className="branch-section"
                        key={section.label}
                        x={547 - index * 18.5}
                        y={302 + index * 32}
                        dominantBaseline="middle"
                        textLength={section.width}
                        lengthAdjust="spacingAndGlyphs"
                        style={{
                          '--label-delay': `${branch.delay + 400 + index * 430}ms`
                        } as CSSProperties}
                      >
                        {section.label}
                      </text>
                    ))}
                  </g>
                </g>
              ))}
            </g>

            <g className="core-layer">
              <polygon className="core-triangle" points="286,286 434,286 360,414" />
              <g clipPath="url(#core-copy-clip)">
                <text className="core-name" x="360" y="320" dominantBaseline="middle" textLength="66" lengthAdjust="spacingAndGlyphs">MAGI</text>
                <text className="core-number" x="360" y="353" dominantBaseline="middle" textLength="30" lengthAdjust="spacingAndGlyphs">01</text>
                <text className="core-original" x="360" y="376" dominantBaseline="middle" textLength="30" lengthAdjust="spacingAndGlyphs">ORIGINAL</text>
              </g>
            </g>
          </g>
        </svg>
        <div className="crt-scanlines" aria-hidden="true" />
        <div className="crt-vignette" aria-hidden="true" />
      </div>
    </main>
  );
}
