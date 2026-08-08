import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MagiBoot } from './index';

describe('MagiBoot module', () => {
  it('accepts caller-controlled sizes and keeps SVG resources unique', () => {
    const markup = renderToStaticMarkup(
      <div>
        <MagiBoot size={320} />
        <MagiBoot size="50%" />
      </div>
    );

    expect(markup).toContain('--magi-boot-size:320px');
    expect(markup).toContain('--magi-boot-size:50%');

    const gradientIds = [...markup.matchAll(/id="(magi-ring-gradient-[^"]+)"/g)]
      .map((match) => match[1]);

    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(2);
  });
});
