/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { AGENT_IDS, type Decision, type Verdict } from './decision';

/** Count valid votes only. Missing votes must never authorize a decision. */
export function aggregateVerdict(votes: Decision['votes']): Verdict {
  const values = AGENT_IDS.map((id) => votes[id]);
  if (values.includes('pending')) return 'review';
  const approve = values.filter((vote) => vote === 'approve').length;
  const reject = values.filter((vote) => vote === 'reject').length;
  return approve > reject ? 'approved' : reject > approve ? 'rejected' : 'review';
}
