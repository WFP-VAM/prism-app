"""Deployed git identity for GET /version."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

_MISSING = {"", "unknown", "HEAD"}


def _repo_root(start: Path | None = None) -> Path | None:
    """Local checkout is <repo>/api/prism_app/version.py. The image file is /prism_app/version.py."""
    path = (start or Path(__file__)).resolve()
    if len(path.parents) <= 2:
        return None
    return path.parents[2]


def _git(args: list[str]) -> str | None:
    root = _repo_root()
    if root is None:
        return None
    try:
        out = subprocess.check_output(
            ["git", *args],
            cwd=root,
            stderr=subprocess.DEVNULL,
            timeout=2,
            text=True,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return _clean(out)


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    if text in _MISSING:
        return None
    return text


def _from_env_or_git(name: str, git_args: list[str]) -> str | None:
    """Use a set env var as-is. Git fallback only when the var was never set."""
    if name in os.environ:
        return _clean(os.environ.get(name))
    return _git(git_args)


def build_version() -> dict[str, str | None]:
    """SHA from the image or deploy env. Branch only when it is a real name."""
    return {
        "sha": _from_env_or_git("GIT_SHA", ["rev-parse", "HEAD"]),
        "branch": _from_env_or_git("GIT_BRANCH", ["rev-parse", "--abbrev-ref", "HEAD"]),
    }
