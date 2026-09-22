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
