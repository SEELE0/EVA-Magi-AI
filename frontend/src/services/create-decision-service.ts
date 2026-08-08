/*
 * Copyright (C) 2026 SEELE0
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * License: https://www.gnu.org/licenses/agpl-3.0.html
 * Commercial license: https://github.com/SEELE0/EVAMagi-AI/blob/main/COMMERCIAL_LICENSE.md
 */
import type { ConnectionMode } from '../domain/decision';
import type { DecisionService } from './decision-service';
import { HttpDecisionService } from './http-decision-service';
import { MockDecisionService } from './mock-decision-service';
import { ResilientDecisionService } from './resilient-decision-service';

export function createDecisionService(): DecisionService {
  const mode = (import.meta.env.VITE_API_MODE ?? 'mock') as ConnectionMode;
  const mock = new MockDecisionService();
  if (mode !== 'remote') return mock;
  return new ResilientDecisionService(
    new HttpDecisionService(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'),
    mock
  );
}
