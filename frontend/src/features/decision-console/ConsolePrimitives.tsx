/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { Agent, Vote } from '../../domain/decision';
import { useTranslation } from 'react-i18next';

export function Readout({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`readout ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function PanelTitle({ index, label }: { index: string; label: string }) {
  return <h2 className="panel-title"><span>{index}</span>{label}</h2>;
}

export function Telemetry({ label, value, level }: { label: string; value: string; level: number }) {
  return (
    <div className="telemetry-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <span className="meter"><i style={{ width: `${level}%` }} /></span>
    </div>
  );
}

export function AgentNode({ agent, vote, position, showTelemetry = true }: { agent: Agent; vote: Vote; position: 'top' | 'left' | 'right'; showTelemetry?: boolean }) {
  const { t } = useTranslation();
  return (
    <article className={`agent-node ${position} vote-${vote}`}>
      <div className="agent-tag">{agent.role}</div>
      <strong>{agent.id}</strong>
      <span className="vote-state">{t(`status.${vote === 'approve' ? 'approve' : vote === 'reject' ? 'reject' : vote === 'abstain' ? 'abstain' : 'waiting'}`)}</span>
      {showTelemetry ? <small>{t(`status.${agent.health}`)} / {agent.latencyMs}ms</small> : null}
    </article>
  );
}
