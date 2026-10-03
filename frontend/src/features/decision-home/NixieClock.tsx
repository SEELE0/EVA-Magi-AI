/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 */
import { useEffect, useState } from 'react';
import './nixie-clock.css';

// Continuous wire shapes, rather than seven-segment display glyphs.
const numeralPaths = [
  'M12 7C3 7 3 29 12 29C21 29 21 7 12 7Z',
  'M7 12L12 7V29M8 29H17',
  'M5 12C5 4 19 5 19 12C19 17 6 22 6 29H19',
  'M6 9C10 4 19 6 18 12C18 17 13 18 10 18M10 18C21 16 22 29 12 29C8 29 6 27 5 25',
  'M17 29V7L5 23H21',
  'M19 7H7L6 17C22 11 22 29 12 29C8 29 6 28 5 25',
  'M18 8C7 1 3 19 6 26C10 33 22 29 19 21C17 13 7 16 6 21',
  'M5 7H20L10 29',
  'M12 17C1 13 6 5 12 6C22 6 22 13 12 17C0 21 6 30 12 29C23 28 24 21 12 17Z',
  'M18 16C17 22 5 21 5 13C5 4 20 3 19 14C19 24 17 31 7 28'
] as const;

export function formatClockTime(date: Date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0')).join(':');
}

export function NixieClock({ label }: { label: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const time = formatClockTime(now);

  return (
    <div className="readout online readout--clock">
      <span>{label}</span>
      <time className="nixie-clock" dateTime={time} aria-label={time}>
        <span className="nixie-clock__accessible">{time}</span>
        <span className="nixie-clock__digits" aria-hidden="true">
          {Array.from(time, (character, index) => character === ':' ? (
            <span className="nixie-clock__separator" key={index}>:</span>
          ) : (
            <span className="nixie-clock__digit-slot" key={index} data-digit={character}>
              <svg className="nixie-clock__cathodes" viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round" strokeLinejoin="round">
                {numeralPaths.map((path, digit) => digit !== Number(character) ? <path key={digit} d={path} /> : null)}
              </svg>
              <span className="nixie-clock__numeral" key={character}>
                <svg viewBox="0 0 24 36" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
                  <path d={numeralPaths[Number(character)]} />
                </svg>
              </span>
            </span>
          ))}
        </span>
      </time>
    </div>
  );
}
