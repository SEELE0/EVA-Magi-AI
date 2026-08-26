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
  it('does not apply URL validation to the internal mock label', () => {
    const config = cloneAgentConfigs()['MELCHIOR-1'];
    const markup = renderToStaticMarkup(<AgentConfigDialog config={config} onClose={() => undefined} onSave={() => undefined} />);

    expect(markup).toContain('type="text"');
    expect(markup).toContain('value="内部模擬回線"');
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
});
