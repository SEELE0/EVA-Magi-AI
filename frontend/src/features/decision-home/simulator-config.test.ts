/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { cloneAgentConfigs, defaultAgentConfigs, serializeAgentConfigsForStorage } from './simulator-config';
import { defaultAgentPrompts, localizeDefaultAgentPrompt } from '../../domain/agent-config';
import { previousDefaultAgentPrompts } from '../../domain/agent-prompts-legacy';

describe('agent simulator configuration', () => {
  it('provides distinct role prompts for all three MAGI personalities', () => {
    expect(defaultAgentConfigs['MELCHIOR-1'].prompt).toContain('科学者');
    expect(defaultAgentConfigs['BALTHASAR-2'].prompt).toContain('母性論理');
    expect(defaultAgentConfigs['CASPER-3'].prompt).toContain('女性論理');
    expect(defaultAgentConfigs['MELCHIOR-1'].connection).toBe('mock');
  });

  it('localizes built-in prompts in all supported languages while preserving custom prompts', () => {
    const locales = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'] as const;
    for (const agentId of Object.keys(defaultAgentConfigs) as (keyof typeof defaultAgentConfigs)[]) {
      for (const locale of locales) {
        expect(localizeDefaultAgentPrompt(agentId, defaultAgentConfigs[agentId].prompt, locale))
          .toBe(defaultAgentPrompts[locale][agentId]);
      }
    }

    const customPrompt = `${defaultAgentConfigs['MELCHIOR-1'].prompt}\nAdditional user instruction.`;
    expect(localizeDefaultAgentPrompt('MELCHIOR-1', customPrompt, 'zh-CN')).toBe(customPrompt);
  });

  it('never serializes API keys', () => {
    const configs = cloneAgentConfigs();
    configs['MELCHIOR-1'].apiKey = 'sk-secret-melchior';
    configs['BALTHASAR-2'].apiKey = 'sk-secret-balthasar';
    const serialized = serializeAgentConfigsForStorage(configs);

    expect(serialized).not.toContain('sk-secret');
    expect(serialized).not.toContain('apiKey');
    expect(serialized).toContain('MAGI-SIM / MELCHIOR');
  });

  it('keeps removal of the editable story rules after language changes', () => {
    const headings = {
      'zh-CN': '剧情推演规则：', 'zh-TW': '劇情推演規則：',
      'en-US': 'Story simulation rules:', 'ja-JP': '物語シミュレーションの規則：'
    };
    for (const locale of Object.keys(defaultAgentPrompts) as (keyof typeof defaultAgentPrompts)[]) {
      for (const agentId of Object.keys(defaultAgentConfigs) as (keyof typeof defaultAgentConfigs)[]) {
        const original = defaultAgentPrompts[locale][agentId];
        expect(original).toContain(headings[locale]);
        const edited = original.slice(0, original.indexOf(`\n\n${headings[locale]}`));
        expect(edited.length).toBeLessThan(original.length);
        for (const target of Object.keys(defaultAgentPrompts) as (keyof typeof defaultAgentPrompts)[]) {
          expect(localizeDefaultAgentPrompt(agentId, edited, target)).toBe(edited);
        }
      }
    }
  });

  it('upgrades unedited previous prompts across languages without overwriting custom edits', () => {
    for (const locale of Object.keys(defaultAgentPrompts) as (keyof typeof defaultAgentPrompts)[]) {
      for (const agentId of Object.keys(defaultAgentConfigs) as (keyof typeof defaultAgentConfigs)[]) {
        for (const previous of Object.values(previousDefaultAgentPrompts)) {
          expect(localizeDefaultAgentPrompt(agentId, previous[agentId], locale)).toBe(defaultAgentPrompts[locale][agentId]);
          const edited = previous[agentId] + '\n自定义人物设定';
          expect(localizeDefaultAgentPrompt(agentId, edited, locale)).toBe(edited);
        }
      }
    }
  });
});
