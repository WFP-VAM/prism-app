"""Map screenshots for AA emails (Playwright sync; replaces Puppeteer)."""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)

sync_playwright = __import__(
    "playwright.sync_api",
    fromlist=["sync_playwright"],
).sync_playwright


@dataclass
class Crop:
    x: int
    y: int
    width: int
    height: int


def capture_screenshot_from_url(
    url: str,
    *,
    crop: Crop | None = None,
    elements_to_hide: list[str] | None = None,
    extra_wait_ms: int = 8000,
    screenshot_target_selector: str = ".maplibregl-canvas",
) -> str:
    """Return base64-encoded JPEG (quality ~70), matching ``capture-utils.ts``."""
    crop = crop or Crop(900, 50, 1000, 950)
    elements_to_hide = elements_to_hide or []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1920,1080",
            ],
        )
        try:
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            page.goto(url, wait_until="load", timeout=180_000)
            page.wait_for_selector(
                screenshot_target_selector,
                state="visible",
                timeout=120_000,
            )
            logger.info("Waiting %s ms for tiles…", extra_wait_ms)
            time.sleep(extra_wait_ms / 1000.0)
            for sel in elements_to_hide:
                page.evaluate(
                    """(s) => {
                      document.querySelectorAll(s).forEach((el) => {
                        el.style.display = "none";
                      });
                    }""",
                    sel,
                )
            el = page.locator(screenshot_target_selector).first
            box = el.bounding_box()
            if box is None:
                raise RuntimeError(
                    f"no layout box for {screenshot_target_selector!r} (hidden or detached?)"
                )
            # ``Crop`` is relative to the map canvas; ``page.screenshot(clip=)`` uses viewport CSS px.
            cw = float(box["width"])
            ch = float(box["height"])
            rel_w = max(0.0, min(float(crop.width), cw - float(crop.x)))
            rel_h = max(0.0, min(float(crop.height), ch - float(crop.y)))
            if rel_w < 1 or rel_h < 1:
                raise RuntimeError(
                    f"crop {crop} outside canvas ({cw:.0f}x{ch:.0f}); adjust Crop or map DOM"
                )
            clip_viewport: dict[str, float] = {
                "x": box["x"] + float(crop.x),
                "y": box["y"] + float(crop.y),
                "width": rel_w,
                "height": rel_h,
            }
            raw = page.screenshot(type="jpeg", quality=70, clip=clip_viewport)
            return base64.b64encode(raw).decode("ascii")
        finally:
            browser.close()
