"""Capture an /export URL with the same Playwright path as batch map export.

Use this to inspect fonts (and layout) exactly as the export_map_worker sees them.

Host (frontend on :3000, Playwright via poetry)::

    cd api
    poetry run python -m prism_app.debug_export_screenshot \\
      --url 'http://localhost:3000/export?hazardLayerIds=rainfall_dekad&date=2026-05-10&language=kh'

Docker (matches production worker; frontend on host :3000)::

    ./scripts/debug_export_screenshot.sh \\
      'http://host.docker.internal:3000/export?hazardLayerIds=rainfall_dekad&date=2026-05-10&language=kh'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any

from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from prism_app.export_maps import (
    PRISM_READY_TIMEOUT,
    close_browser_pool,
    get_browser_pool,
)

logger = logging.getLogger(__name__)

_FONT_DIAG_JS = """() => {
  const titleEl =
    document.querySelector('[class*="titleOverlay"] h6') ||
    document.querySelector('h6') ||
    document.body;
  const footerEl =
    document.querySelector('[class*="footerOverlay"]') || document.body;
  const legendEl =
    document.querySelector('[class*="legendListStyle"] h4') ||
    document.querySelector('[class*="legendListStyle"]') ||
    document.body;
  return {
    prismReady: window.PRISM_READY === true,
    location: window.location.href,
    fontsStatus: document.fonts ? document.fonts.status : null,
    loadedFontFaces: document.fonts
      ? [...document.fonts].map((f) => ({
          family: f.family,
          status: f.status,
          weight: f.weight,
          style: f.style,
        }))
      : [],
    titleFontFamily: getComputedStyle(titleEl).fontFamily,
    legendFontFamily: getComputedStyle(legendEl).fontFamily,
    footerFontFamily: getComputedStyle(footerEl).fontFamily,
    legendText: (legendEl.textContent || '').trim().slice(0, 200),
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    titleText: (titleEl.textContent || '').trim().slice(0, 200),
    footerText: (footerEl.textContent || '').trim().slice(0, 200),
  };
}"""


def normalize_export_url_for_docker(url: str) -> str:
    """Batch worker cannot reach host loopback; map to host.docker.internal."""
    return (
        url.replace("localhost:3000", "host.docker.internal:3000")
        .replace("127.0.0.1:3000", "host.docker.internal:3000")
        .replace("[::1]:3000", "host.docker.internal:3000")
    )


async def collect_font_diagnostics(page: Any) -> dict[str, Any]:
    return await page.evaluate(_FONT_DIAG_JS)


async def capture_export_screenshot(
    url: str,
    *,
    viewport_width: int,
    viewport_height: int,
    for_docker: bool,
) -> tuple[bytes, dict[str, Any]]:
    render_url = normalize_export_url_for_docker(url) if for_docker else url
    pool = await get_browser_pool()
    context = await pool.acquire()
    page = await context.new_page()
    try:
        await page.set_viewport_size(
            {"width": viewport_width, "height": viewport_height},
        )
        await page.emulate_media(media="screen")
        logger.info("Navigating to %s", render_url)
        await page.goto(render_url)
        await page.wait_for_function(
            "window.PRISM_READY === true",
            timeout=PRISM_READY_TIMEOUT,
        )
        await page.evaluate("() => document.fonts.ready")
        diagnostics = await collect_font_diagnostics(page)
        png_bytes = await page.screenshot(type="png", full_page=True)
        return png_bytes, diagnostics
    except PlaywrightTimeoutError as exc:
        debug_path = Path("/tmp/prism_debug_export_timeout.png")
        await page.screenshot(path=str(debug_path), full_page=True)
        raise RuntimeError(
            f"Timed out waiting for PRISM_READY at {render_url}. "
            f"Debug screenshot: {debug_path}. "
            "Is the frontend running and is the layer/date valid?"
        ) from exc
    finally:
        await page.close()
        await pool.release(context)
        await close_browser_pool()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        required=True,
        help="Full /export URL (include &language=kh or language=ar for font tests)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("cache/debug-export.png"),
        help="PNG output path (default: cache/debug-export.png)",
    )
    parser.add_argument(
        "--fonts-json",
        type=Path,
        default=None,
        help="Optional path to write font diagnostics JSON",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=1200,
        help="Viewport width in px (default: 1200)",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=900,
        help="Viewport height in px (default: 900)",
    )
    parser.add_argument(
        "--docker",
        action="store_true",
        help="Rewrite localhost → host.docker.internal (auto-detected when unset)",
    )
    parser.add_argument(
        "--no-docker",
        action="store_true",
        help="Do not rewrite localhost (poetry on host)",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    for_docker = args.docker
    if not args.no_docker and not args.docker:
        for_docker = Path("/.dockerenv").exists()

    async def _run() -> None:
        png_bytes, diagnostics = await capture_export_screenshot(
            args.url,
            viewport_width=args.width,
            viewport_height=args.height,
            for_docker=for_docker,
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(png_bytes)
        print(f"Wrote {args.output.resolve()} ({len(png_bytes)} bytes)")
        print(json.dumps(diagnostics, indent=2, ensure_ascii=False))
        if args.fonts_json:
            args.fonts_json.parent.mkdir(parents=True, exist_ok=True)
            args.fonts_json.write_text(
                json.dumps(diagnostics, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"Wrote font diagnostics to {args.fonts_json.resolve()}")

    try:
        asyncio.run(_run())
    except Exception as exc:
        print(f"Capture failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
