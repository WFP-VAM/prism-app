"""TDD: canonical export payload + fingerprint (global dedupe)."""

import hashlib
import json

import pytest
from prism_app.export_jobs.fingerprint import compute_request_fingerprint
from prism_app.models import MapExportRequestModel


def test_fingerprint_stable_for_same_payload():
    req = MapExportRequestModel(
        urls=["http://localhost/?x=1&date=2025-01-01"],
        viewportWidth=1200,
        viewportHeight=849,
        format="pdf",
    )
    a = compute_request_fingerprint(req)
    b = compute_request_fingerprint(req)
    assert a == b
    assert len(a) == 64


def test_fingerprint_preserves_urls_list_order():
    u1 = MapExportRequestModel(
        urls=[
            "http://localhost/?d=1&date=2025-01-01",
            "http://localhost/?d=2&date=2025-01-02",
        ],
        format="pdf",
    )
    u2 = MapExportRequestModel(
        urls=[
            "http://localhost/?d=2&date=2025-01-02",
            "http://localhost/?d=1&date=2025-01-01",
        ],
        format="pdf",
    )
    assert compute_request_fingerprint(u1) != compute_request_fingerprint(u2)


def test_fingerprint_sorts_object_keys_at_each_level():
    """Dict key order in JSON serialization must not change the hash."""
    raw_a = {
        "format": "pdf",
        "urls": ["http://localhost/?date=2025-01-01"],
        "viewportHeight": 849,
        "viewportWidth": 1200,
    }
    raw_b = {
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
        "urls": ["http://localhost/?date=2025-01-01"],
    }
    m_a = MapExportRequestModel.model_validate(raw_a)
    m_b = MapExportRequestModel.model_validate(raw_b)
    assert compute_request_fingerprint(m_a) == compute_request_fingerprint(m_b)


def test_fingerprint_matches_manual_sha256_contract():
    req = MapExportRequestModel(
        urls=["http://localhost/?date=2025-01-01"],
        viewportWidth=1200,
        viewportHeight=849,
        format="pdf",
    )
    from prism_app.export_jobs.fingerprint import canonical_request_dict

    body = json.dumps(
        canonical_request_dict(req),
        separators=(",", ":"),
        ensure_ascii=False,
        sort_keys=True,
    )
    expected = hashlib.sha256(body.encode("utf-8")).hexdigest()
    assert compute_request_fingerprint(req) == expected
