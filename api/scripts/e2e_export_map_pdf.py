#!/usr/bin/env python3
"""E2E: run Playwright export_maps from the staging-moz dict fixture or a JSON file.

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
        default=None,
        help="Optional MapExportRequest JSON file (default: built-in staging-moz dict)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=_DEFAULT_OUTPUT,
        help=f"Output PDF path (default: {_DEFAULT_OUTPUT})",
    )
    args = p.parse_args(argv)
    output: Path = args.output

    _api_root_on_path()
    from prism_app.e2e_export_maps import render_map_export_fixture
    from prism_app.tests.fixtures.moz_export import moz_export_map_request_dict

    if args.fixture is not None:
        fixture_path: Path = args.fixture
        if not fixture_path.is_file():
            print(f"Fixture not found: {fixture_path}", file=sys.stderr)
            return 1
        payload: dict | Path = fixture_path
    else:
        payload = moz_export_map_request_dict()

    async def _run() -> None:
        pdf_bytes, content_type = await render_map_export_fixture(payload)
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
