/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { AGENT_CONFIG_STORAGE_KEY, loadAgentConfigs, saveAgentConfigs } from './agent-config-store';
import { cloneAgentConfigs } from '../domain/agent-config';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    snapshot: () => Object.fromEntries(data)
  };
}

describe('agent config store', () => {
  it('saves non-secret fields and reloads them without API keys', () => {
    const storage = memoryStorage();
    const configs = cloneAgentConfigs();
    configs['MELCHIOR-1'] = {
      ...configs['MELCHIOR-1'],
      connection: 'openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      model: 'glm-test',
      apiKey: 'sk-should-never-persist',
      prompt: 'カスタム科学カード'
    };

    expect(saveAgentConfigs(configs, storage)).toBe(true);
    expect(storage.snapshot()[AGENT_CONFIG_STORAGE_KEY]).not.toContain('sk-should-never-persist');
    expect(storage.snapshot()[AGENT_CONFIG_STORAGE_KEY]).not.toContain('apiKey');

    const restored = loadAgentConfigs(storage);
    expect(restored['MELCHIOR-1'].connection).toBe('openai-compatible');
    expect(restored['MELCHIOR-1'].baseUrl).toBe('https://api.example.com/v1');
    expect(restored['MELCHIOR-1'].model).toBe('glm-test');
    expect(restored['MELCHIOR-1'].prompt).toBe('カスタム科学カード');
    expect(restored['MELCHIOR-1'].apiKey).toBe('');
    // 未変更の人格は既定のまま
    expect(restored['CASPER-3'].connection).toBe('mock');
    expect(restored['CASPER-3'].prompt).toContain('女性論理');
  });

  it('falls back to defaults on corrupted or foreign payloads', () => {
    expect(loadAgentConfigs(memoryStorage({ [AGENT_CONFIG_STORAGE_KEY]: '{broken json' })))
      .toEqual(cloneAgentConfigs());
    expect(loadAgentConfigs(memoryStorage({ [AGENT_CONFIG_STORAGE_KEY]: '{"version":99,"configs":{}}' })))
      .toEqual(cloneAgentConfigs());
  });

  it('ignores unknown connection values and oversized fields', () => {
    const payload = JSON.stringify({
      version: 1,
      configs: {
        'MELCHIOR-1': { connection: 'carrier-pigeon', baseUrl: 'x'.repeat(2_000), model: 42, prompt: 'ok' },
        'BALTHASAR-2': { connection: 'local-compatible', baseUrl: 'http://localhost:1234/v1', model: 'local' }
      }
    });
    const restored = loadAgentConfigs(memoryStorage({ [AGENT_CONFIG_STORAGE_KEY]: payload }));

    expect(restored['MELCHIOR-1'].connection).toBe('mock');
    expect(restored['MELCHIOR-1'].baseUrl.length).toBeLessThanOrEqual(500);
    expect(restored['MELCHIOR-1'].model).toBe(cloneAgentConfigs()['MELCHIOR-1'].model);
    expect(restored['MELCHIOR-1'].prompt).toBe('ok');
    expect(restored['BALTHASAR-2'].connection).toBe('local-compatible');
    expect(restored['BALTHASAR-2'].apiKey).toBe('');
  });
});
