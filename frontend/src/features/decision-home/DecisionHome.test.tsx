/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { DecisionHome } from './DecisionHome';
import i18n from '../../i18n';

beforeEach(async () => { await i18n.changeLanguage('ja-JP'); });

describe('DecisionHome structure', () => {
  it('renders the title bar, three MAGI personalities and decision controls', () => {
    const markup = renderToStaticMarkup(<DecisionHome />);

    expect(markup).toContain('特務機関NERV');
    expect(markup).toContain('MAGI');
    expect(markup).toContain('System');
    expect(markup).toContain(i18n.t('settings.connection'));
    expect(markup.match(/<h1>[\s\S]*?<\/h1>/)?.[0]).toBe('<h1>MAGI <span>System</span></h1>');
    expect(markup).toContain('# EVA TV版とMAGI：共有背景');
    expect(markup).toContain('時刻');
    expect(markup).toContain('class="topbar"');
    expect(markup).toContain('class="brand-block"');
    expect(markup).toContain('class="brand-mark"');
    expect(markup).toContain('class="header-readout"');
    expect(markup).toContain('class="magi-home__scanlines"');
    expect(markup).toContain('class="network-topology"');
    expect(markup).toContain('data-node-frame="top"');
    expect(markup).toContain('data-node-frame="left"');
    expect(markup).toContain('data-node-frame="right"');
    expect(markup).toContain('MELCHIOR-1');
    expect(markup).toContain('BALTHASAR-2');
    expect(markup).toContain('CASPER-3');
    expect(markup).not.toContain('MAGI/03');
    expect(markup).toContain('待機');
    expect(markup).toContain('判定議題');
    expect(markup).toContain(i18n.t('decision.execute'));
    expect(markup).toContain('magi-home__deliberation-grid');
    expect(markup).toContain('class="magi-network "');
    expect(markup).toContain('class="network-links"');
    expect(markup).toContain('viewBox="0 0 600 420"');
    expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(markup).toContain('--decision-node-top-y:-4%');
    expect(markup).toContain('--decision-node-top-height:46%');
    expect(markup).not.toContain('preserveAspectRatio="none"');
    expect(markup).toContain('MELCHIOR-1 · 人格ノード設定');
    expect(markup).not.toContain('CFG-01');
    expect(markup).not.toContain('CFG-02');
    expect(markup).not.toContain('CFG-03');
    expect(markup).not.toContain('事象記録');
    expect(markup).not.toContain('EVENT LOG');
    expect(markup).not.toContain('magi-home__events');
    expect(markup).not.toContain('magi-home__verdict');
    expect(markup).not.toContain('RESULT OF THE DELIBERATION');
    expect(markup).not.toContain('CONSENSUS');
    expect(markup).not.toContain('STATUS');
    expect(markup).not.toContain('RESPONSE');
  });
});
