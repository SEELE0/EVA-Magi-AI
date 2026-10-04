/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */

/** Apply at the boundary from in-memory credentials to public snapshots/storage. */
export function redactSecrets<T>(value: T, secrets: string[]): T {
  const tokens = [...new Set(secrets.map((key) => key.trim()).filter(Boolean)
    .flatMap((key) => [key, encodeURIComponent(key)]))].sort((a, b) => b.length - a.length);
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (key === 'apiKey') return undefined;
    if (typeof item !== 'string') return item;
    return tokens.reduce((text, secret) => text.split(secret).join('[REDACTED]'), item);
  })) as T;
}

/** Withhold a trailing credential prefix until the next chunk can be redacted safely. */
export function redactStreamingSecrets(text: string, secrets: string[]): string {
  const tokens = secrets.map(key => key.trim()).filter(Boolean).flatMap(key => [key, encodeURIComponent(key)]);
  let held = 0;
  for (const token of tokens) {
    for (let length = Math.min(token.length - 1, text.length); length > held; length--) {
      if (text.endsWith(token.slice(0, length))) { held = length; break; }
    }
  }
  return redactSecrets(held ? text.slice(0, -held) : text, secrets);
}
