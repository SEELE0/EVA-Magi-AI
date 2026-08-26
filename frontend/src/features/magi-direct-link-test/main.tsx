/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import { createRoot } from 'react-dom/client';
import {
  CONNECTION_DATA_LINES,
  MAGI_NETWORK_LAYOUT,
  SYSTEM_DATA_LINES,
  TERMINAL_MODULE_LAYOUT,
  TERMINAL_VIEWBOX,
  toSvgPoints,
  toSvgTranslate,
  type AgentModuleLayout,
} from './layout';
import './magi-direct-link-test.css';

function TerminalHeader() {
  const layout = TERMINAL_MODULE_LAYOUT.header;

  return (
    <g
      className="terminal-orange terminal-header"
      transform={toSvgTranslate(layout.origin)}
    >
      <rect width={layout.width} height={layout.height} rx={layout.radius} />
      <line
        className="terminal-header__divider"
        x1={layout.frameInset}
        y1={layout.dividerOffset}
        x2={layout.width - layout.frameInset}
        y2={layout.dividerOffset}
      />
      <text
        x={layout.contentInset}
        y={layout.firstBaseline}
        textLength="299"
        lengthAdjust="spacingAndGlyphs"
        className="header-line header-line--small"
      >
        DIRECT LINK CONNECTION : MAGI 01
      </text>
      <text
        x={layout.contentInset}
        y={layout.secondBaseline}
        textLength="133"
        lengthAdjust="spacingAndGlyphs"
        className="header-line header-line--access"
      >
        ACCESS MODE :
      </text>
      <text
        x={layout.accessValueOffset}
        y={layout.secondBaseline}
        textLength="154"
        lengthAdjust="spacingAndGlyphs"
        className="header-line header-line--superuser"
      >
        SUPERUSER
      </text>
    </g>
  );
}

function MotionResult() {
  const layout = TERMINAL_MODULE_LAYOUT.motion;
  const secondRailX = layout.railWidth + layout.railGap;
  const rightRailX = layout.width - layout.railWidth;
  const rightSecondRailX = rightRailX - layout.railWidth - layout.railGap;

  return (
    <g
      className="terminal-orange motion-result"
      transform={toSvgTranslate(layout.origin)}
    >
      <g className="motion-result__rails">
        <rect width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={secondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={rightSecondRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
        <rect x={rightRailX} width={layout.railWidth} height={layout.railHeight} rx={layout.railRadius} />
      </g>
      <text x={layout.contentInset} y={layout.firstBaseline} textLength={layout.contentWidth} lengthAdjust="spacingAndGlyphs" className="motion-copy">RESULT OF THE DELIBERATION</text>
      <text x={layout.contentInset} y={layout.secondBaseline} textLength={layout.contentWidth} lengthAdjust="spacingAndGlyphs" className="motion-title">MOTION : SELF DESTRUCTION</text>
    </g>
  );
}

function SystemData() {
  const layout = TERMINAL_MODULE_LAYOUT.systemData;

  return (
    <g
      className="terminal-orange system-data"
      transform={toSvgTranslate(layout.origin)}
    >
      {SYSTEM_DATA_LINES.map((line, index) => (
        <text key={line} y={index * layout.lineHeight}>{line}</text>
      ))}
    </g>
  );
}

function ConnectionData() {
  const layout = TERMINAL_MODULE_LAYOUT.connectionData;

  return (
    <g
      className="terminal-orange connection-data"
      transform={toSvgTranslate(layout.origin)}
    >
      {CONNECTION_DATA_LINES.map((line) => (
        <text
          key={line.text}
          y={line.baseline}
          className={'small' in line ? 'connection-data__small' : undefined}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}

function AgentFrame({ agent }: { readonly agent: AgentModuleLayout }) {
  return (
    <polyline
      className="magi-outline"
      data-agent-frame={agent.id}
      points={toSvgPoints(agent.frame)}
    />
  );
}

function AgentContent({ agent }: { readonly agent: AgentModuleLayout }) {
  const [nameX, nameY] = agent.namePlacement.anchor;
  const [voteX, voteY] = agent.votePlacement.anchor;
  const denied = agent.decision === 'denied';

  return (
    <g data-agent-content={agent.id}>
      <text
        x={nameX}
        y={nameY}
        textLength={agent.namePlacement.length}
        lengthAdjust="spacingAndGlyphs"
        className={`agent-name agent-name--${agent.id}`}
      >
        {agent.name}
      </text>
      <rect
        className={`vote-box${denied ? ' vote-box--denied' : ''}`}
        x={agent.voteBox.x}
        y={agent.voteBox.y}
        width={agent.voteBox.width}
        height={agent.voteBox.height}
      />
      <text
        x={voteX}
        y={voteY}
        textLength={agent.votePlacement.length}
        lengthAdjust="spacingAndGlyphs"
        className={`vote-text${denied ? ' vote-text--denied' : ''}`}
      >
        {agent.vote}
      </text>
    </g>
  );
}

function MagiGeometry() {
  const layout = MAGI_NETWORK_LAYOUT;
  const [lowerStartX, lowerStartY] = layout.lowerConnector.start;
  const [lowerEndX] = layout.lowerConnector.end;
  const [labelX, labelY] = layout.label.anchor;

  return (
    <g className="magi-geometry">
      {layout.diagonalConnectors.map((connector) => (
        <polygon
          key={connector.id}
          className="magi-connector-band"
          data-connector={connector.id}
          points={toSvgPoints(connector.points)}
        />
      ))}
      <path
        className="magi-connector--lower"
        data-connector="lower"
        d={`M${lowerStartX} ${lowerStartY}H${lowerEndX}`}
        strokeWidth={layout.lowerConnector.width}
      />
      {layout.agents.map((agent) => (
        <AgentFrame key={agent.id} agent={agent} />
      ))}
      <polygon className="magi-core" points={toSvgPoints(layout.hub)} />
      <text
        x={labelX}
        y={labelY}
        textLength={layout.label.length}
        lengthAdjust="spacingAndGlyphs"
        className="magi-label"
      >
        MAGI
      </text>
      {layout.agents.map((agent) => (
        <AgentContent key={agent.id} agent={agent} />
      ))}
    </g>
  );
}

function MagiTerminalGraphic() {
  return (
    <svg
      className="terminal-graphic"
      viewBox={`0 0 ${TERMINAL_VIEWBOX.width} ${TERMINAL_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="MAGI deliberation result terminal. Direct link superuser terminal showing a self destruction motion. Balthasar and Melchior approve, while Casper denies."
    >
      <defs>
        <filter
          id="orange-glow"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodColor="#ff4518" floodOpacity="0.94" result="orange-color" />
          <feComposite in="orange-color" in2="SourceAlpha" operator="in" result="orange-source" />
          <feFlood floodColor="#ffad61" floodOpacity="0.18" result="orange-core-color" />
          <feComposite in="orange-core-color" in2="SourceAlpha" operator="in" result="orange-hot-core" />
          <feGaussianBlur in="orange-source" stdDeviation="1.4" result="orange-near" />
          <feGaussianBlur in="orange-source" stdDeviation="4.8" result="orange-mid" />
          <feGaussianBlur in="orange-source" stdDeviation="9" result="orange-far" />
          <feComponentTransfer in="orange-near" result="orange-near-hot">
            <feFuncA type="linear" slope="1.55" />
          </feComponentTransfer>
          <feComponentTransfer in="orange-mid" result="orange-mid-soft">
            <feFuncA type="linear" slope="0.85" />
          </feComponentTransfer>
          <feComponentTransfer in="orange-far" result="orange-far-soft">
            <feFuncA type="linear" slope="0.42" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="orange-far-soft" />
            <feMergeNode in="orange-mid-soft" />
            <feMergeNode in="orange-near-hot" />
            <feMergeNode in="orange-hot-core" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="green-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="red-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <TerminalHeader />
      <MotionResult />
      <SystemData />
      <ConnectionData />
      <MagiGeometry />
    </svg>
  );
}

export function MagiDirectLinkTest() {
  return (
    <main className="direct-link-page">
      <section className="terminal-screen" aria-label="MAGI direct link terminal screen">
        <MagiTerminalGraphic />
      </section>
    </main>
  );
}

const hotGlobal = globalThis as typeof globalThis & {
  __magiDirectLinkRoot?: ReturnType<typeof createRoot>;
};
const root = hotGlobal.__magiDirectLinkRoot ?? createRoot(document.getElementById('root')!);
hotGlobal.__magiDirectLinkRoot = root;
root.render(<MagiDirectLinkTest />);
