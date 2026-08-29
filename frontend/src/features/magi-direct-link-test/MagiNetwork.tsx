/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { KeyboardEvent } from 'react';
import type { AgentId, Decision, Vote } from '../../domain/decision';
import {
  MAGI_NETWORK_LAYOUT,
  toMagiNetworkTransform,
  toSvgPoints,
  type AgentModuleLayout,
  type MagiNetworkPosition,
  type MagiNetworkState,
} from './layout';

interface MagiNetworkProps {
  readonly disabled: boolean;
  readonly position: MagiNetworkPosition;
  readonly scanning: boolean;
  readonly state: MagiNetworkState;
  readonly votes: Decision['votes'];
  readonly onOpenConfig: (agentId: AgentId) => void;
}

const votePresentation: Record<Vote, { label: string; className: string }> = {
  pending: { label: '待機', className: 'pending' },
  approve: { label: '承認', className: 'approve' },
  reject: { label: '否決', className: 'reject' },
  abstain: { label: '棄権', className: 'abstain' },
};

function AgentFrame({ agent }: { readonly agent: AgentModuleLayout }) {
  return <polyline className="magi-outline" data-agent-frame={agent.id} points={toSvgPoints(agent.frame)} />;
}

function AgentContent({ agent, vote }: { readonly agent: AgentModuleLayout; readonly vote: Vote }) {
  const [nameX, nameY] = agent.namePlacement.anchor;
  const [voteX, voteY] = agent.votePlacement.anchor;
  const presentation = votePresentation[vote];

  return (
    <g data-agent-content={agent.id}>
      <text x={nameX} y={nameY} textLength={agent.namePlacement.length} lengthAdjust="spacingAndGlyphs" className={`agent-name agent-name--${agent.id}`}>{agent.name}</text>
      <rect className={`vote-box vote-box--${presentation.className}`} x={agent.voteBox.x} y={agent.voteBox.y} width={agent.voteBox.width} height={agent.voteBox.height} />
      <text x={voteX} y={voteY} textLength={agent.votePlacement.length} lengthAdjust="spacingAndGlyphs" className={`vote-text vote-text--${presentation.className}`}>{presentation.label}</text>
    </g>
  );
}

function activateAgent(
  event: KeyboardEvent<SVGGElement>,
  agentId: AgentId,
  disabled: boolean,
  onOpenConfig: (agentId: AgentId) => void,
) {
  if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  onOpenConfig(agentId);
}

export function MagiNetwork({ disabled, position, scanning, state, votes, onOpenConfig }: MagiNetworkProps) {
  const layout = MAGI_NETWORK_LAYOUT;
  const [lowerStartX, lowerStartY] = layout.lowerConnector.start;
  const [lowerEndX] = layout.lowerConnector.end;
  const [labelX, labelY] = layout.label.anchor;

  return (
    <g
      className={`magi-geometry magi-network${scanning ? ' is-scanning' : ''}`}
      data-magi-network=""
      data-network-state={state}
      style={{ transform: toMagiNetworkTransform(position, state) }}
    >
      {layout.diagonalConnectors.map((connector) => <polygon key={connector.id} className="magi-connector-band" data-connector={connector.id} points={toSvgPoints(connector.points)} />)}
      <path className="magi-connector--lower" data-connector="lower" d={`M${lowerStartX} ${lowerStartY}H${lowerEndX}`} strokeWidth={layout.lowerConnector.width} />
      {layout.agents.map((agent) => {
        const vote = votes[agent.agentId];
        return (
          <g
            aria-disabled={disabled || undefined}
            aria-label={`${agent.agentId} の設定を開く`}
            className={`agent-module agent-module--${agent.id} vote-${votePresentation[vote].className}`}
            key={agent.id}
            onClick={() => { if (!disabled) onOpenConfig(agent.agentId); }}
            onKeyDown={(event) => activateAgent(event, agent.agentId, disabled, onOpenConfig)}
            role="button"
            tabIndex={disabled ? -1 : 0}
          >
            <AgentFrame agent={agent} />
            <AgentContent agent={agent} vote={vote} />
            <polyline aria-hidden="true" className="agent-hit-target" points={toSvgPoints(agent.frame)} />
          </g>
        );
      })}
      <polygon className="magi-core" points={toSvgPoints(layout.hub)} />
      <text x={labelX} y={labelY} textLength={layout.label.length} lengthAdjust="spacingAndGlyphs" className="magi-label">MAGI</text>
    </g>
  );
}
