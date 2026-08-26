# Copyright (C) 2026 SEELE0
# SPDX-License-Identifier: AGPL-3.0-or-later
# License: https://www.gnu.org/licenses/agpl-3.0.html

"""Framework-neutral ports reserved for the future MAGI backend.

This module intentionally has no FastAPI, database, or model-provider dependency.
The HTTP contract lives in ``docs/openapi.yaml``; these protocols define the
internal seams that a concrete backend should implement.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional, Protocol

AgentId = Literal["MELCHIOR-1", "BALTHASAR-2", "CASPER-3"]
Vote = Literal["approve", "reject", "abstain"]
Verdict = Literal["approved", "rejected", "review"]
Priority = Literal["low", "normal", "critical"]
ProviderConnection = Literal["mock", "openai-compatible", "local-compatible"]


@dataclass(frozen=True)
class AgentInvocation:
    """Normalized input passed from orchestration to one provider adapter."""

    decision_id: str
    agent_id: AgentId
    subject: str
    priority: Priority
    role_prompt: str


@dataclass(frozen=True)
class AgentOutput:
    """User-visible result; never store private chain-of-thought here."""

    agent_id: AgentId
    role: str
    vote: Vote
    output: str
    connection: ProviderConnection
    base_url: str
    model: str
    latency_ms: int
    generated_at: str


@dataclass(frozen=True)
class PublicAgentConfiguration:
    """Configuration safe to return through the REST API."""

    agent_id: AgentId
    role: str
    connection: ProviderConnection
    base_url: str
    model: str
    role_prompt: str
    credential_configured: bool


@dataclass(frozen=True)
class AgentConfigurationUpdate:
    """Write model. ``api_key`` may be accepted but must never be returned."""

    agent_id: AgentId
    connection: ProviderConnection
    base_url: str
    model: str
    role_prompt: str
    api_key: Optional[str] = None
    clear_credential: bool = False

    def public_view(self, role: str, credential_configured: bool) -> PublicAgentConfiguration:
        return PublicAgentConfiguration(
            agent_id=self.agent_id,
            role=role,
            connection=self.connection,
            base_url=self.base_url,
            model=self.model,
            role_prompt=self.role_prompt,
            credential_configured=credential_configured,
        )


class AgentProvider(Protocol):
    """Adapter implemented once per OpenAI-compatible or local provider."""

    async def invoke(self, request: AgentInvocation) -> AgentOutput:
        ...


class AgentConfigurationStore(Protocol):
    """Persists public settings and an encrypted credential reference."""

    async def get_public(self, agent_id: AgentId) -> PublicAgentConfiguration:
        ...

    async def update(self, update: AgentConfigurationUpdate) -> PublicAgentConfiguration:
        ...


class DecisionRepository(Protocol):
    """Persistence boundary for decisions, events, and final Agent outputs."""

    async def create(self, subject: str, priority: Priority) -> str:
        ...

    async def save_output(self, decision_id: str, output: AgentOutput) -> None:
        ...

    async def list_outputs(self, decision_id: str) -> List[AgentOutput]:
        ...

    async def complete(self, decision_id: str, verdict: Verdict) -> None:
        ...


class DecisionOrchestrator(Protocol):
    """Application service responsible for one idempotent three-Agent run."""

    async def execute(self, decision_id: str) -> None:
        ...
