"""GET /version reports the deployed git SHA."""

from __future__ import annotations

import pytest
from prism_app.version import build_version


def test_version_prefers_env_over_git(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GIT_SHA", "abc123")
    monkeypatch.setenv("GIT_BRANCH", "aa-flood-2026")
    monkeypatch.setattr("prism_app.version._git", lambda _args: "from-git")

    assert build_version() == {"sha": "abc123", "branch": "aa-flood-2026"}


def test_version_hides_detached_head(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GIT_SHA", "abc123")
    monkeypatch.setenv("GIT_BRANCH", "HEAD")
    monkeypatch.setattr(
        "prism_app.version._git",
        lambda _args: pytest.fail("git fallback should not run when env is set"),
    )

    assert build_version() == {"sha": "abc123", "branch": None}


def test_version_falls_back_to_git(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GIT_SHA", raising=False)
    monkeypatch.delenv("GIT_BRANCH", raising=False)

    def fake_git(args: list[str]) -> str | None:
        if args == ["rev-parse", "HEAD"]:
            return "deadbeef"
        if args == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return "master"
        return None

    monkeypatch.setattr("prism_app.version._git", fake_git)

    assert build_version() == {"sha": "deadbeef", "branch": "master"}
