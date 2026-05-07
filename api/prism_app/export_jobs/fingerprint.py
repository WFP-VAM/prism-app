"""Stable fingerprint for map export jobs (dedupe + idempotency helpers)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from prism_app.models import MapExportRequestModel


def _canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _canonicalize(value[k]) for k in sorted(value.keys())}
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value


def canonical_request_dict(request: MapExportRequestModel) -> dict[str, Any]:
    """Validated export body with sorted object keys at every nesting level."""
    data = request.model_dump(mode="json")
    return _canonicalize(data)


def compute_request_fingerprint(request: MapExportRequestModel) -> str:
    """SHA-256 hex of canonical export body (dedupe is global, not per-user)."""
    body = json.dumps(
        canonical_request_dict(request),
        separators=(",", ":"),
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(body.encode("utf-8")).hexdigest()
