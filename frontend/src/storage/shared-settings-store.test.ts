/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest';
import { defaultSharedSettings } from '../domain/shared-settings';
import { loadSharedSettings, saveSharedSettings } from './shared-settings-store';

describe('shared settings store', () => {
  it('restores a setting book longer than 12,000 characters without truncation', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); }
    };
    const background = '第十三集：使徒入侵。'.repeat(1_500);
    const settings = { ...defaultSharedSettings(), background };

    expect(background.length).toBeGreaterThan(12_000);
    expect(saveSharedSettings(settings, storage)).toBe(true);
    expect(loadSharedSettings(storage).background).toBe(background);
  });
});
