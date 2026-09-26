/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentId, Decision, Vote } from '../../domain/decision';
import {
  MAGI_NETWORK_LAYOUT,
  toMagiNetworkTransform,
  toSvgPoints,
  type AgentModuleLayout,
  type MagiNetworkState,
  type MagiNetworkTransform,
} from './layout';

export interface MagiNetworkProps {
  readonly disabled: boolean;
  readonly scanning: boolean;
  readonly state: MagiNetworkState;
  readonly transform: MagiNetworkTransform;
  readonly votes: Decision['votes'];
  readonly onOpenConfig: (agentId: AgentId) => void;
}

const voteClass: Record<Vote, string> = { pending: 'pending', approve: 'approve', reject: 'reject', abstain: 'abstain' };

function AgentFrame({ agent }: { readonly agent: AgentModuleLayout }) {
  return (
    <>
      <polyline className="magi-outline" data-agent-frame={agent.id} points={toSvgPoints(agent.frame)} />
      <polyline
        aria-hidden="true"
        className="magi-outline magi-outline--shared"
        data-agent-shared-edge={agent.id}
        points={toSvgPoints(agent.sharedCoreBoundary)}
      />
    </>
  );
}

function AgentContent({ agent, vote }: { readonly agent: AgentModuleLayout; readonly vote: Vote }) {
  const { t } = useTranslation();
  const [nameX, nameY] = agent.namePlacement.anchor;
  const [voteX, voteY] = agent.votePlacement.anchor;
  const label = t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`);
  const presentation = { label, className: voteClass[vote] };

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

export function MagiNetwork({ disabled, scanning, state, transform, votes, onOpenConfig }: MagiNetworkProps) {
  const { t } = useTranslation();
  const layout = MAGI_NETWORK_LAYOUT;
  const [lowerStartX, lowerStartY] = layout.lowerConnector.start;
  const [lowerEndX] = layout.lowerConnector.end;
  const [labelX, labelY] = layout.label.anchor;

  return (
    <g
      className={`magi-network${scanning ? ' is-scanning' : ''}`}
      data-magi-network=""
      data-network-state={state}
      data-position-x={transform.x}
      data-position-y={transform.y}
      data-scale={transform.scale}
      style={{ transform: toMagiNetworkTransform(transform) }}
    >
      {layout.diagonalConnectors.map((connector) => <polygon key={connector.id} className="magi-connector-band" data-connector={connector.id} points={toSvgPoints(connector.points)} />)}
      <path className="magi-connector--lower" data-connector="lower" d={`M${lowerStartX} ${lowerStartY}H${lowerEndX}`} strokeWidth={layout.lowerConnector.width} />
      <polygon className="magi-core" points={toSvgPoints(layout.hub)} />
      {layout.agents.map((agent) => {
        const vote = votes[agent.agentId];
        return (
          <g
            aria-disabled={disabled || undefined}
            aria-label={`${agent.agentId} · ${t('decision.nodeConfig')}`}
            className={`agent-module agent-module--${agent.id} vote-${voteClass[vote]}`}
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
      <text x={labelX} y={labelY} textLength={layout.label.length} lengthAdjust="spacingAndGlyphs" className="magi-label">MAGI</text>
    </g>
  );
}
