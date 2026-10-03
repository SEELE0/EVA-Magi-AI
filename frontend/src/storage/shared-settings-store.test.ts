/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest';
import { defaultSharedSettings } from '../domain/shared-settings';
import { resolveAgentConfigs } from '../domain/shared-settings';
import { loadSharedSettings, saveSharedSettings } from './shared-settings-store';

describe('shared settings store', () => {
  it('persists node names without inheriting another node or global name', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const settings = defaultSharedSettings();
    settings.global.displayName = 'global name';
    settings.nodes['MELCHIOR-1'].displayName = '证据评估';
    settings.nodes['BALTHASAR-2'].displayName = '照护评估';
    settings.nodes['MELCHIOR-1'].role = '证据审查';
    settings.nodes['BALTHASAR-2'].role = '生命照护';
    settings.sources['BALTHASAR-2'] = 'MELCHIOR-1';
    saveSharedSettings(settings, storage);
    const restored = loadSharedSettings(storage);
    const resolved = resolveAgentConfigs(restored);
    expect(resolved['MELCHIOR-1'].displayName).toBe('证据评估');
    expect(resolved['BALTHASAR-2'].displayName).toBe('照护评估');
    expect(resolved['MELCHIOR-1'].role).toBe('证据审查');
    expect(resolved['BALTHASAR-2'].role).toBe('生命照护');
    expect(restored.sources['MELCHIOR-1']).toBe('global');
    expect(resolved['CASPER-3'].displayName).toBeUndefined();
  });
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
