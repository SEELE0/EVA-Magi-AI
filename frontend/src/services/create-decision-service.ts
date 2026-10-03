/* Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later */
import type { DecisionService } from './decision-service';
import { HttpDecisionService } from './http-decision-service';
import { MockDecisionService } from './mock-decision-service';

/** Main delegates execution to its backend. Mock is an explicit preview option. */
export function createDecisionService(): DecisionService {
  if (import.meta.env.VITE_API_MODE === 'mock') return new MockDecisionService();
  return new HttpDecisionService(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000');
}
