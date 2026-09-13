/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentConfigDialog } from './AgentConfigDialog';
import { cloneAgentConfigs } from './simulator-config';

describe('AgentConfigDialog BASE URL validation', () => {
  it('hides unused connection fields in mock mode', () => {
    const config = cloneAgentConfigs()['MELCHIOR-1'];
    const markup = renderToStaticMarkup(<AgentConfigDialog config={config} onClose={() => undefined} onSave={() => undefined} />);

    expect(markup).not.toContain('type="url"');
    expect(markup).not.toContain('type="password"');
    expect(markup).toContain('役割カード PROMPT');
    expect(markup).not.toContain('required=""');
  });

  it('requires a valid URL for compatible connection modes', () => {
    const config = {
      ...cloneAgentConfigs()['MELCHIOR-1'],
      connection: 'openai-compatible' as const,
      baseUrl: 'https://example.invalid/v1'
    };
    const markup = renderToStaticMarkup(<AgentConfigDialog config={config} onClose={() => undefined} onSave={() => undefined} />);

    expect(markup).toContain('type="url"');
    expect(markup).toContain('required=""');
  });

  it('exposes an original terminal skin without changing the form contract', () => {
    const config = cloneAgentConfigs()['BALTHASAR-2'];
    const markup = renderToStaticMarkup(
      <AgentConfigDialog config={config} onClose={() => undefined} onSave={() => undefined} variant="original" />
    );

    expect(markup).toContain('magi-home__config-dialog--original');
    expect(markup).toContain('BALTHASAR-2 ノード設定');
    expect(markup).toContain('接続情報の入力は不要です');
    expect(markup).toContain('役割カード PROMPT');
  });
});
