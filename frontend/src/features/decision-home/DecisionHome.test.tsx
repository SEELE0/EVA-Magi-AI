/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DecisionHome } from './DecisionHome';

describe('DecisionHome structure', () => {
  it('renders the title bar, three MAGI personalities and decision controls', () => {
    const markup = renderToStaticMarkup(<DecisionHome />);

    expect(markup).toContain('特務機関NERV');
    expect(markup).toContain('MAGI');
    expect(markup).toContain('System');
    expect(markup).toContain('回線');
    expect(markup).toContain('系統');
    expect(markup).toContain('時刻');
    expect(markup).toContain('class="topbar"');
    expect(markup).toContain('class="brand-block"');
    expect(markup).toContain('class="brand-mark"');
    expect(markup).toContain('class="header-readout"');
    expect(markup).toContain('class="magi-home__scanlines"');
    expect(markup).toContain('class="network-connectors"');
    expect(markup).toContain('x1="259.2" y1="180" x2="193.2" y2="208"');
    expect(markup).toContain('x1="276" y1="333.8" x2="324" y2="333.8"');
    expect(markup).not.toContain('x1="264" y1="333.8" x2="336"');
    expect(markup).toContain('MELCHIOR-1');
    expect(markup).toContain('BALTHASAR-2');
    expect(markup).toContain('CASPER-3');
    expect(markup).toContain('第03中枢');
    expect(markup).toContain('待機');
    expect(markup).toContain('正常');
    expect(markup).toContain('判定議題');
    expect(markup).toContain('判定開始');
    expect(markup).toContain('magi-home__deliberation-grid');
    expect(markup).toContain('class="magi-network "');
    expect(markup).toContain('class="network-links"');
    expect(markup).toContain('viewBox="0 0 600 420"');
    expect(markup).toContain('MELCHIOR-1 の設定を開く');
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
