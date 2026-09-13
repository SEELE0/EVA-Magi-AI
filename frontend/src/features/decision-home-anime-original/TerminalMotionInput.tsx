/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useLayoutEffect, useRef } from 'react';

/** Native editing/IME, with a decorative underline caret measured in matching typography. */
export function TerminalMotionInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const prefix = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);

  function syncCaret() {
    const field = input.current;
    const surface = mirror.current;
    if (!field || !surface || !prefix.current || !marker.current || !caret.current) return;
    const style = getComputedStyle(field);
    for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'box-sizing', 'word-spacing', 'tab-size']) {
      surface.style.setProperty(property, style.getPropertyValue(property));
    }
    surface.style.width = `${field.clientWidth}px`;
    prefix.current.textContent = field.value.slice(0, field.selectionStart);
    marker.current.textContent = field.value.slice(field.selectionStart) || '\u200b';
    const point = marker.current.getClientRects()[0] || marker.current.getBoundingClientRect();
    const origin = surface.getBoundingClientRect();
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.35;
    caret.current.style.left = `${point.left - origin.left - field.scrollLeft}px`;
    caret.current.style.top = `${point.top - origin.top + lineHeight - 3 - field.scrollTop}px`;
    caret.current.style.width = `${Number.parseFloat(style.fontSize) * .62}px`;
    caret.current.hidden = field.selectionStart !== field.selectionEnd;
  }

  useLayoutEffect(syncCaret, [value]);
  useLayoutEffect(() => {
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncCaret);
    if (input.current) observer?.observe(input.current);
    document.fonts?.addEventListener('loadingdone', syncCaret);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener('loadingdone', syncCaret);
    };
  }, []);

  return (
    <div className="motion-composer__editor" data-empty={value.length === 0}>
      <textarea
        ref={input} id="direct-link-motion" value={value} maxLength={240} rows={2}
        placeholder="ENTER MOTION FOR DELIBERATION..."
        onChange={(event) => { onChange(event.target.value); syncCaret(); }}
        onSelect={syncCaret} onScroll={syncCaret} onFocus={syncCaret} onKeyUp={syncCaret}
        onCompositionStart={() => input.current?.parentElement?.classList.add('is-composing')}
        onCompositionEnd={() => { input.current?.parentElement?.classList.remove('is-composing'); syncCaret(); }}
      />
      <div className="motion-composer__caret-mirror" ref={mirror} aria-hidden="true"><span ref={prefix} /><span ref={marker} /></div>
      <span className="motion-composer__caret" ref={caret} aria-hidden="true" />
    </div>
  );
}
