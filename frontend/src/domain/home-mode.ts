/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */

export type HomeMode = 'original' | 'modern';

export const DEFAULT_HOME_MODE: HomeMode = 'original';
export const HOME_MODE_SESSION_KEY = 'magi-nerv:home-mode';

export function readHomeMode(): HomeMode {
  if (typeof window === 'undefined') return DEFAULT_HOME_MODE;

  try {
    const storedMode = window.sessionStorage.getItem(HOME_MODE_SESSION_KEY);
    return storedMode === 'original' || storedMode === 'modern'
      ? storedMode
      : DEFAULT_HOME_MODE;
  } catch {
    return DEFAULT_HOME_MODE;
  }
}

export function saveHomeMode(mode: HomeMode) {
  try {
    window.sessionStorage.setItem(HOME_MODE_SESSION_KEY, mode);
  } catch {
    // Restricted storage must not prevent the selected interface from opening.
  }
}
