/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { describe, expect, it } from 'vitest';
import { cloneAgentConfigs, defaultAgentConfigs, serializeAgentConfigsForStorage } from './simulator-config';

describe('agent simulator configuration', () => {
  it('provides distinct role prompts for all three MAGI personalities', () => {
    expect(defaultAgentConfigs['MELCHIOR-1'].prompt).toContain('科学者');
    expect(defaultAgentConfigs['BALTHASAR-2'].prompt).toContain('母性論理');
    expect(defaultAgentConfigs['CASPER-3'].prompt).toContain('女性論理');
    expect(defaultAgentConfigs['MELCHIOR-1'].connection).toBe('mock');
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
});
