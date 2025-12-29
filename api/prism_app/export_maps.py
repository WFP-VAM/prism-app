"""Map export functionality using Playwright for server-side rendering."""

import asyncio
import io
import logging
import os
import tempfile
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Final, Optional, Tuple

from playwright.async_api import Browser, BrowserContext, Playwright
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter

from .models import ExportFormat
from .utils import extract_dates_from_urls

logger = logging.getLogger(__name__)

# Timeouts
PAGE_TIMEOUT: Final[int] = 60000
PRISM_READY_TIMEOUT: Final[int] = 30000

# Viewport settings
BASE_WIDTH: Final[int] = 1200
DEVICE_SCALE_FACTOR: Final[int] = 2

# Pool settings
BROWSER_POOL_SIZE: Final[int] = int(os.getenv("BROWSER_POOL_SIZE", "2"))
MAX_RENDER_RETRIES: Final[int] = 3

# Browser launch arguments optimized for Docker with proper shm_size
BROWSER_LAUNCH_ARGS: Final[list[str]] = [
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-accelerated-2d-canvas",
    "--disable-background-networking",
    "--disable-extensions",
    "--js-flags=--max-old-space-size=512",
]


@dataclass
class BrowserPool:
    """Pool of browser instances with persistent contexts for caching."""

    playwright: Playwright
    browsers: list[Browser] = field(default_factory=list)
    contexts: list[BrowserContext] = field(default_factory=list)
    available: asyncio.Queue = field(default_factory=asyncio.Queue)
    size: int = 0

    @classmethod
    async def create(cls, size: int) -> "BrowserPool":
        """Create a new browser pool with persistent contexts for caching."""
        playwright = await async_playwright().start()
        pool = cls(playwright=playwright, size=size)

        for i in range(size):
            browser = await playwright.chromium.launch(args=BROWSER_LAUNCH_ARGS)
            # context = await browser.new_context(device_scale_factor=DEVICE_SCALE_FACTOR)
            context = await browser.new_context()
            pool.browsers.append(browser)
            pool.contexts.append(context)
            await pool.available.put(context)
            logger.info(f"Browser pool: created instance {i + 1}/{size}")

        return pool

    async def acquire(self) -> BrowserContext:
        """Acquire a browser context from the pool (blocks if none available)."""
        return await self.available.get()

    async def release(self, context: BrowserContext) -> None:
        """Return a browser context to the pool."""
        await self.available.put(context)

    async def close(self) -> None:
        """Close all contexts, browsers, and playwright."""
        for context in self.contexts:
            try:
                await context.close()
            except Exception:
                pass
        for browser in self.browsers:
            try:
                await browser.close()
            except Exception:
                pass
        try:
            await self.playwright.stop()
        except Exception:
            pass
        logger.info("Browser pool: closed all instances")


# Module-level pool state
_pool: Optional[BrowserPool] = None
_pool_lock: Optional[asyncio.Lock] = None


def _get_pool_lock() -> asyncio.Lock:
    """Get or create the pool lock, ensuring it's created in a running event loop."""
    global _pool_lock
    if _pool_lock is None:
        _pool_lock = asyncio.Lock()
    return _pool_lock


async def get_browser_pool() -> BrowserPool:
    """Get or create the shared browser pool."""
    global _pool
    async with _get_pool_lock():
        if _pool is None:
            _pool = await BrowserPool.create(BROWSER_POOL_SIZE)
            logger.info(f"Browser pool: initialized with {BROWSER_POOL_SIZE} instances")
        return _pool


async def close_browser_pool() -> None:
    """Close the shared browser pool."""
    global _pool, _pool_lock
    async with _get_pool_lock():
        if _pool is not None:
            await _pool.close()
            _pool = None
        _pool_lock = None
        logger.info("Browser pool: closed")


# Legacy aliases for backwards compatibility with tests
async def close_browser() -> None:
    """Alias for close_browser_pool for backwards compatibility."""
    await close_browser_pool()


async def render_single_map(
    context: BrowserContext,
    url: str,
    viewport_width: int,
    viewport_height: int,
    render_format: str,
) -> bytes:
    """
    Render a single map using an existing browser context and return the image/PDF bytes.

    Args:
        context: Playwright browser context (shares cache with other pages in same context)
        url: URL to render (should include all map parameters)
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        render_format: Render format ('pdf' for PDF, 'png' for PNG screenshot)

    Returns: Bytes of the rendered map (PNG or PDF)

    Raises: PlaywrightTimeoutError: If rendering times out after all retries
    """
    url = url.replace("localhost:3000", "host.docker.internal:3000")
    last_error: Optional[PlaywrightTimeoutError] = None

    for attempt in range(1, MAX_RENDER_RETRIES + 1):
        page = await context.new_page()
        page.set_default_timeout(PAGE_TIMEOUT)
        await page.set_viewport_size(
            {"width": viewport_width, "height": viewport_height}
        )
        await page.emulate_media(media="screen")
        await page.goto(url)

        # Wait for PRISM_READY flag (set by frontend after map tiles are loaded)
        try:
            await page.wait_for_function(
                "window.PRISM_READY === true", timeout=PRISM_READY_TIMEOUT
            )
        except PlaywrightTimeoutError as e:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            await page.screenshot(
                path=f"/tmp/prism_debug_{timestamp}.png", full_page=True
            )
            logger.warning(
                f"Timeout on {url} (attempt {attempt}/{MAX_RENDER_RETRIES}). "
                f"Screenshot: /tmp/prism_debug_{timestamp}.png"
            )
            await page.close()
            last_error = e

            if attempt < MAX_RENDER_RETRIES:
                # Wait briefly before retrying
                await asyncio.sleep(1)
                continue
            else:
                logger.error(
                    f"All {MAX_RENDER_RETRIES} render attempts failed for {url}"
                )
                raise

        # Capture screenshot or PDF
        if render_format == "pdf":
            result = await page.pdf(
                width=f"{viewport_width}px",
                height=f"{viewport_height}px",
                print_background=True,
            )
        else:  # PNG
            result = await page.screenshot(
                type="png",
                full_page=True,
            )

        await page.close()
        return result

    # This should never be reached, but satisfies type checker
    raise last_error


async def render_to_file(
    pool: BrowserPool,
    url: str,
    viewport_width: int,
    viewport_height: int,
    render_format: str,
    output_path: Path,
) -> None:
    """
    Render a single map using a browser from the pool and write to file.

    Args:
        pool: Browser pool to acquire context from
        url: URL to render (should include all map parameters)
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        render_format: Render format ('pdf' for PDF, 'png' for PNG screenshot)
        output_path: Path to write the rendered output
    """
    context = await pool.acquire()
    try:
        result_bytes = await render_single_map(
            context, url, viewport_width, viewport_height, render_format
        )
        output_path.write_bytes(result_bytes)
    finally:
        await pool.release(context)


async def export_maps(
    urls: list[str],
    viewport_width: int,
    viewport_height: int,
    format_type: ExportFormat,
) -> Tuple[bytes, str]:
    """
    Export maps for multiple dates and return packaged file.

    Args:
        urls: List of base URLs with map parameters
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        format_type: Output format ('pdf' or 'zip')
    Returns: Tuple of (file_bytes, content_type)
    """
    export_start = time.time()
    logger.info(f"Timing: Starting export_maps for {len(urls)} maps")

    # Step 1: Extract dates and setup
    setup_start = time.time()
    dates = extract_dates_from_urls(urls)
    logger.info(f"Timing: Setup completed in {time.time() - setup_start:.2f}s")

    # Step 2: Get browser pool
    pool_start = time.time()
    pool = await get_browser_pool()
    logger.info(
        f"Timing: Browser pool ready in {time.time() - pool_start:.2f}s "
        f"(pool size: {pool.size})"
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        file_extension = "pdf" if format_type == "pdf" else "png"

        output_paths = [
            tmpdir_path / f"map_{i}_{date}.{file_extension}"
            for i, date in enumerate(dates)
        ]

        # Step 3: Render all maps - pool handles concurrency via acquire/release
        render_start = time.time()
        render_tasks = [
            render_to_file(
                pool,
                url,
                viewport_width,
                viewport_height,
                format_type,
                output_path,
            )
            for url, output_path in zip(urls, output_paths)
        ]
        await asyncio.gather(*render_tasks)
        logger.info(
            f"Timing: All {len(urls)} maps rendered in {time.time() - render_start:.2f}s"
        )

        # Step 4: Package results
        package_start = time.time()
        if format_type == "pdf":
            pdf_writer = PdfWriter()
            for output_path in output_paths:
                pdf_reader = PdfReader(output_path)
                for page in pdf_reader.pages:
                    pdf_writer.add_page(page)

            output_buffer = io.BytesIO()
            pdf_writer.write(output_buffer)
            result = (output_buffer.getvalue(), "application/pdf")
            logger.info(
                f"Timing: PDF packaging completed in {time.time() - package_start:.2f}s"
            )
        else:  # png format
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for date, output_path in zip(dates, output_paths):
                    filename = f"map_{date}.png"
                    zip_file.write(output_path, filename)
            result = (zip_buffer.getvalue(), "application/zip")
            logger.info(
                f"Timing: ZIP packaging completed in {time.time() - package_start:.2f}s"
            )

    logger.info(
        f"Timing: Total export_maps completed in {time.time() - export_start:.2f}s"
    )
    return result
