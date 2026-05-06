#!/usr/bin/env python3
"""E2E: load a MapExportRequest JSON fixture, run Playwright export_maps, write PDF.

Requires network access to URLs in the fixture and Playwright browsers::

    poetry run playwright install chromium

From ``api/``::

    poetry run python scripts/e2e_export_map_pdf.py
    poetry run python scripts/e2e_export_map_pdf.py -o /tmp/out.pdf
    poetry run python scripts/e2e_export_map_pdf.py -f path/to/request.json -o out.pdf
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

_DEFAULT_FIXTURE = (
    Path(__file__).resolve().parent.parent
    / "prism_app"
    / "tests"
    / "fixtures"
    / "staging_moz_export_map_request.json"
)
_DEFAULT_OUTPUT = Path("e2e-output") / "map_export_e2e.pdf"


def _api_root_on_path() -> Path:
    root = Path(__file__).resolve().parent.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    return root


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "-f",
        "--fixture",
        type=Path,
        default=_DEFAULT_FIXTURE,
        help=f"MapExportRequest JSON (default: {_DEFAULT_FIXTURE})",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=_DEFAULT_OUTPUT,
        help=f"Output PDF path (default: {_DEFAULT_OUTPUT})",
    )
    args = p.parse_args(argv)
    fixture: Path = args.fixture
    output: Path = args.output
    if not fixture.is_file():
        print(f"Fixture not found: {fixture}", file=sys.stderr)
        return 1

    _api_root_on_path()
    from prism_app.e2e_export_maps import render_map_export_fixture

    async def _run() -> None:
        pdf_bytes, content_type = await render_map_export_fixture(fixture)
        if content_type != "application/pdf":
            raise SystemExit(f"Expected application/pdf, got {content_type!r}")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(pdf_bytes)

    try:
        asyncio.run(_run())
    except Exception as e:
        print(f"Export failed: {e}", file=sys.stderr)
        return 1
    print(f"Wrote {output.resolve()} ({output.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
