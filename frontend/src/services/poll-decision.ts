/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { Decision, DecisionEvent } from '../domain/decision';
import type { DecisionRequestOptions, DecisionService } from './decision-service';

export const DEFAULT_DECISION_POLL_INTERVAL_MS = 220;

export function isTerminalDecision(decision: Decision) {
  return decision.status === 'completed' || decision.status === 'failed';
}

function abortError() {
  const error = new Error('Decision polling was cancelled.');
  error.name = 'AbortError';
  return error;
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    const cancel = () => {
      globalThis.clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(abortError());
    };
    signal.addEventListener('abort', cancel, { once: true });
  });
}

interface PollDecisionOptions extends DecisionRequestOptions {
  intervalMs?: number;
  onDecision?: (decision: Decision) => void;
  onEvents?: (events: DecisionEvent[]) => void;
}

export async function pollDecisionUntilTerminal(
  service: DecisionService,
  decisionId: string,
  options: PollDecisionOptions
): Promise<Decision> {
  const intervalMs = Math.max(1, options.intervalMs ?? DEFAULT_DECISION_POLL_INTERVAL_MS);
  if (!options.signal) throw new Error('Decision polling requires an AbortSignal.');

  let latest: Decision;
  do {
    await delay(intervalMs, options.signal);
    const [decision, events] = await Promise.all([
      service.getDecision(decisionId, options),
      options.onEvents ? service.getEvents(decisionId, options) : Promise.resolve(null)
    ]);
    latest = decision;
    options.onDecision?.(decision);
    if (events) options.onEvents?.(events);
  } while (!isTerminalDecision(latest));

  return latest;
}
