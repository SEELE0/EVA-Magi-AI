import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import { DecisionHome } from './DecisionHome';

const initialLocale = i18n.resolvedLanguage ?? i18n.language;

describe('decision home navigation labels', () => {
  afterEach(async () => {
    await i18n.changeLanguage(initialLocale);
  });

  it('uses the concise settings label and hides the selected locale until the language menu opens', async () => {
    await i18n.changeLanguage('zh-CN');
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DecisionHome />
      </I18nextProvider>
    );
    const navClassIndex = markup.indexOf('class="magi-home__primary-nav"');
    const navStart = markup.lastIndexOf('<nav', navClassIndex);
    const navEnd = markup.indexOf('</nav>', navStart);
    const navigation = markup.slice(navStart, navEnd + '</nav>'.length);

    expect(navigation).toContain('class="magi-home__nav-button">设置</button>');
    expect(markup).toContain('aria-label="打开导航菜单"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="magi-primary-navigation"');
    expect(markup).toContain('class="magi-language-selector__translate-icon"');
    expect(markup).toContain('aria-label="选择界面语言"');
    expect(navigation).not.toContain('magi-language-selector');
    expect(markup.indexOf('class="magi-language-selector')).toBeGreaterThan(navEnd);
    expect(navigation).not.toContain('简体中文');
  });
});
