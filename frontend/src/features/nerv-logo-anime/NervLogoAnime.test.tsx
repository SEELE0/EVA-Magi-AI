/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NervLogoAnime } from './index';

describe('NervLogoAnime module', () => {
  it('accepts a caller-controlled size and optional fade-out', () => {
    const markup = renderToStaticMarkup(
      <NervLogoAnime size="40vw" fadeOut={false} className="logo-preview" />
    );

    expect(markup).toContain('nerv-logo-anime logo-preview');
    expect(markup).toContain('--nerv-logo-size:40vw');
    expect(markup).not.toContain('nerv-logo-anime--fade-out');
  });
});
