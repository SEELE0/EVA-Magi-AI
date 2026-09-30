/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { AgentConfigDialog } from './AgentConfigDialog';
import { cloneAgentConfigs } from './simulator-config';
import i18n from '../../i18n';

beforeEach(async () => {
  await i18n.changeLanguage('ja-JP');
});

function renderDialog(config: ReturnType<typeof cloneAgentConfigs>[keyof ReturnType<typeof cloneAgentConfigs>], variant?: 'modern' | 'original') {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <AgentConfigDialog config={config} onClose={() => undefined} onSave={() => undefined} variant={variant} />
    </I18nextProvider>
  );
}

describe('AgentConfigDialog BASE URL validation', () => {
  it('hides unused connection fields in mock mode', () => {
    const config = cloneAgentConfigs()['MELCHIOR-1'];
    const markup = renderDialog(config);

    expect(markup).not.toContain('type="url"');
    expect(markup).not.toContain('type="password"');
    expect(markup).toContain('役割プロンプト');
    expect(markup).not.toContain('required=""');
  });

  it('renders the built-in role prompt in the selected interface language', async () => {
    await i18n.changeLanguage('zh-CN');
    const config = cloneAgentConfigs()['MELCHIOR-1'];
    const markup = renderDialog(config);

    expect(markup).toContain('请以科学家的视角进行判断');
    expect(markup).not.toContain('あなたは科学者として');
  });

  it('keeps a user-edited role prompt unchanged when the interface is localized', async () => {
    await i18n.changeLanguage('zh-CN');
    const config = { ...cloneAgentConfigs()['MELCHIOR-1'], prompt: 'User-authored prompt text.' };
    const markup = renderDialog(config);

    expect(markup).toContain('User-authored prompt text.');
  });

  it('requires a valid URL for compatible connection modes', () => {
    const config = {
      ...cloneAgentConfigs()['MELCHIOR-1'],
      connection: 'openai-compatible' as const,
      baseUrl: 'https://example.invalid/v1'
    };
    const markup = renderDialog(config);

    expect(markup).toContain('type="url"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="API キーを表示"');
    expect(markup).toContain('required=""');
  });

  it('exposes an original terminal skin without changing the form contract', () => {
    const config = cloneAgentConfigs()['BALTHASAR-2'];
    const markup = renderDialog(config, 'original');

    expect(markup).toContain('magi-home__config-dialog--original');
    expect(markup).toContain('BALTHASAR-2 ノード設定');
    expect(markup).toContain('aria-label="設定を閉じる"><span aria-hidden="true">×</span></button>');
    expect(markup).toContain('接続情報の入力は不要です');
    expect(markup).toContain('役割プロンプト');
  });
});
