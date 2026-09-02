/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BiosStart } from './BiosStart';

describe('BiosStart module', () => {
  it('renders the orange CRT BIOS self-test copy and terminal handoff', () => {
    const markup = renderToStaticMarkup(<BiosStart />);

    expect(markup).toContain('MAGI COMMAND TERMINAL');
    expect(markup).toContain('MEMORY TEST');
    expect(markup).toContain('MELCHIOR-1');
    expect(markup).toContain('THREE NODES SYNCHRONIZED.');
    expect(markup).toContain('GOD&#x27;S IN HIS HEAVEN.');
    expect(markup).toContain('bios-start__cursor');
  });
});
