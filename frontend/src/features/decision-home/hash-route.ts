/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import type { SimulatorRoute } from './simulator-types';

export function parseSimulatorHash(hash: string): SimulatorRoute {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/history' || path === '/history/') return { name: 'history' };

  const match = path.match(/^\/history\/([^/]+)\/?$/);
  if (match) {
    try {
      return { name: 'history-detail', id: decodeURIComponent(match[1]) };
    } catch {
      return { name: 'history' };
    }
  }

  return { name: 'decision' };
}

export function historyDetailHref(id: string) {
  return `#/history/${encodeURIComponent(id)}`;
}

export function currentSimulatorRoute(): SimulatorRoute {
  return typeof window === 'undefined' ? { name: 'decision' } : parseSimulatorHash(window.location.hash);
}
