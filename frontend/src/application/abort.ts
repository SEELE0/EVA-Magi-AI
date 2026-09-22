/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { DecisionServiceError } from './decision-service';

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DecisionServiceError('判定已取消。', 'REQUEST_ABORTED');
}

export function waitFor(milliseconds: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(new DecisionServiceError('判定已取消。', 'REQUEST_ABORTED'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
