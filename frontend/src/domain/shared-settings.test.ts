/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import { describe, expect, it } from 'vitest';
import { AGENT_IDS } from './decision';
import { defaultSharedSettings, prepareNodeConfig, resolveAgentConfigs, sameApiService } from './shared-settings';
import { loadSharedSettings, saveSharedSettings } from '../storage/shared-settings-store';

function independentSettings() {
  const settings = defaultSharedSettings();
  settings.global = { ...settings.global, connection: 'openai-compatible', baseUrl: 'https://service.invalid/v1', model: 'global-model', apiKey: 'fixture-global-key' };
  for (const id of AGENT_IDS) {
    settings.sources[id] = id;
    settings.nodes[id] = { ...settings.nodes[id], connection: 'openai-compatible', baseUrl: settings.global.baseUrl, model: `model-${id}`, apiKey: '' };
  }
  return settings;
}

describe('shared API credentials', () => {
  it('supplies the global key to independent models on the same service', () => {
    const settings = independentSettings(); const resolved = resolveAgentConfigs(settings);
    for (const id of AGENT_IDS) {
      expect(resolved[id].apiKey).toBe('fixture-global-key');
      expect(resolved[id].model).toBe(`model-${id}`);
      expect(resolved[id].prompt).toBe(settings.nodes[id].prompt);
      expect(settings.nodes[id].apiKey).toBe('');
    }
  });
  it('preserves an explicit node key instead of replacing it', () => {
    const settings = independentSettings(); settings.nodes['CASPER-3'].apiKey = 'fixture-node-key';
    expect(resolveAgentConfigs(settings)['CASPER-3'].apiKey).toBe('fixture-node-key');
  });
  it.each(['https://another.invalid/v1', 'https://service.invalid/another-tenant', 'http://service.invalid/v1', '', 'not a URL', 'https://service.invalid/v1?token=x', 'https://user@service.invalid/v1'])('does not share a key with a different or invalid endpoint %s', baseUrl => {
    const settings = independentSettings(); settings.nodes['CASPER-3'].baseUrl = baseUrl;
    expect(resolveAgentConfigs(settings)['CASPER-3'].apiKey).toBe('');
  });
  it('recognizes equivalent trailing slashes, default ports, and completion paths', () => {
    const settings = independentSettings(); const node = settings.nodes['CASPER-3'];
    expect(sameApiService({ ...node, baseUrl: ' https://SERVICE.invalid:443/v1/ ' }, settings.global)).toBe(true);
    expect(sameApiService({ ...node, baseUrl: 'https://service.invalid/v1/chat/completions' }, settings.global)).toBe(true);
    expect(sameApiService({ ...node, connection: 'mock' }, settings.global)).toBe(false);
  });
  it('follows global key changes after a node model is edited, without copying the inherited key', () => {
    const settings = independentSettings(); const id = 'CASPER-3';
    settings.nodes[id] = prepareNodeConfig(settings, { ...resolveAgentConfigs(settings)[id], model: 'new-node-model' });
    expect(settings.nodes[id].apiKey).toBe('');
    settings.global.apiKey = 'fixture-replacement';
    expect(resolveAgentConfigs(settings)[id].apiKey).toBe('fixture-replacement');
    expect(resolveAgentConfigs(settings)[id].model).toBe('new-node-model');
  });
  it('also keeps a global follower borrowing the key when switching to its own model', () => {
    const settings = independentSettings(); const id = 'MELCHIOR-1'; settings.sources[id] = 'global';
    settings.nodes[id] = prepareNodeConfig(settings, { ...resolveAgentConfigs(settings)[id], model: 'node-model' });
    settings.sources[id] = id; settings.global.apiKey = 'fixture-replacement';
    expect(resolveAgentConfigs(settings)[id].apiKey).toBe('fixture-replacement');
  });
  it('keeps a deliberately changed key and never carries an inherited key to a changed service', () => {
    const settings = independentSettings(); const before = resolveAgentConfigs(settings)['CASPER-3'];
    expect(prepareNodeConfig(settings, { ...before, apiKey: 'fixture-explicit' }).apiKey).toBe('fixture-explicit');
    settings.nodes['CASPER-3'] = prepareNodeConfig(settings, { ...before, baseUrl: 'https://different.invalid/v1' });
    expect(resolveAgentConfigs(settings)['CASPER-3'].apiKey).toBe('');
  });
  it('resolves another node source using its own key or the same-service global key', () => {
    const settings = independentSettings(); settings.sources['BALTHASAR-2'] = 'MELCHIOR-1';
    expect(resolveAgentConfigs(settings)['BALTHASAR-2'].apiKey).toBe('fixture-global-key');
    settings.nodes['MELCHIOR-1'].apiKey = 'fixture-node-key';
    expect(resolveAgentConfigs(settings)['BALTHASAR-2'].apiKey).toBe('fixture-node-key');
  });
  it('restores only public settings after reload, then shares the reentered global key', () => {
    const settings = independentSettings(); const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    saveSharedSettings(settings, storage);
    expect([...data.values()].join('')).not.toContain('fixture-global-key');
    const restored = loadSharedSettings(storage);
    for (const id of AGENT_IDS) expect(resolveAgentConfigs(restored)[id].apiKey).toBe('');
    restored.global.apiKey = 'fixture-reentered';
    for (const id of AGENT_IDS) expect(resolveAgentConfigs(restored)[id].apiKey).toBe('fixture-reentered');
  });
});
