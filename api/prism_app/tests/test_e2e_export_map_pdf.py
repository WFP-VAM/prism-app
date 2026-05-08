"""E2E: real URLs + Playwright → PDF (opt-in; not run in default CI)."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from prism_app.e2e_export_maps import render_map_export_fixture
from pypdf import PdfReader

_FIXTURE = Path(__file__).parent / "fixtures" / "staging_moz_export_map_request.json"


@pytest.mark.e2e
@pytest.mark.network
@pytest.mark.asyncio
async def test_e2e_staging_fixture_produces_multi_page_pdf() -> None:
    """Hit staging Firebase preview /export URLs; requires Playwright + network."""
    pdf_bytes, content_type = await render_map_export_fixture(_FIXTURE)
    assert content_type == "application/pdf"
    assert len(pdf_bytes) > 10_000, "PDF unexpectedly small"
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) == 3
