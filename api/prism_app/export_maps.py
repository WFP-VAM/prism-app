"""Map export functionality using Playwright for server-side rendering."""

import asyncio
import fnmatch
import io
import logging
import os
import tempfile
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Final, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from playwright.async_api import Browser, Playwright
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter

from .models import ExportFormat

logger = logging.getLogger(__name__)

# Timeouts
PAGE_TIMEOUT: Final[int] = 60000
PRISM_READY_TIMEOUT: Final[int] = 30000

# Viewport settings
BASE_WIDTH: Final[int] = 1200
DEVICE_SCALE_FACTOR: Final[int] = 2

# Concurrency settings
MAX_CONCURRENT_RENDERS: Final[int] = int(os.getenv("MAX_CONCURRENT_RENDERS", "2"))
MAX_RENDER_RETRIES: Final[int] = 3

# Browser launch arguments for reduced memory usage
BROWSER_LAUNCH_ARGS: Final[list[str]] = [
    "--disable-dev-shm-usage",  # Critical for Docker environments
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-accelerated-2d-canvas",
    "--disable-background-networking",
    "--disable-extensions",
    "--js-flags=--max-old-space-size=512",
]


# Module-level browser state (singleton via module)
Playwright_instance: Optional[Playwright] = None
Browser_instance: Optional[Browser] = None
Browser_lock: Optional[asyncio.Lock] = None


def _get_lock() -> asyncio.Lock:
    """Get or create the browser lock, ensuring it's created in a running event loop."""
    global Browser_lock
    if Browser_lock is None:
        Browser_lock = asyncio.Lock()
    return Browser_lock


async def get_browser() -> Browser:
    """Get or create a shared browser instance."""
    global Playwright_instance, Browser_instance
    async with _get_lock():
        if Browser_instance is None or not Browser_instance.is_connected():
            # Clean up existing browser if disconnected
            if Browser_instance is not None:
                try:
                    await Browser_instance.close()
                except Exception:
                    pass

            if Playwright_instance is None:
                Playwright_instance = await async_playwright().start()

            Browser_instance = await Playwright_instance.chromium.launch(
                args=BROWSER_LAUNCH_ARGS
            )
            logger.info("Browser: new instance created")

        return Browser_instance


async def close_browser() -> None:
    """Close the shared browser instance and playwright."""
    global Playwright_instance, Browser_instance, Browser_lock
    async with _get_lock():
        if Browser_instance is not None:
            try:
                await Browser_instance.close()
            except Exception:
                pass
            Browser_instance = None

        if Playwright_instance is not None:
            try:
                await Playwright_instance.stop()
            except Exception:
                pass
            Playwright_instance = None

        # Reset lock so next event loop gets a fresh one
        Browser_lock = None

        logger.info("Browser: closed")


# Allowed domains for export URLs
# Add domains to this list to allow them for map exports
EXPORT_ALLOWED_DOMAINS: Final[list[str]] = [
    "*.wfp.org",
    "staging-prism-frontend--*.web.app",  # Firebase preview builds
]


def validate_export_url(url: str) -> None:
    """
    Validate that the export URL is from an allowed domain and includes a date parameter.

    Validation rules:
    - Requires absolute URLs (must have scheme like http:// or https://)
    - Relative URLs are not allowed for security reasons
    - Allows file:// URLs (for local testing)
    - Requires hostname for non-file URLs
    - Allows localhost with any port (localhost, 127.0.0.1, ::1)
    - Checks against EXPORT_ALLOWED_DOMAINS list
    - Supports glob patterns
    - Matches if hostname equals base domain or ends with ".{base_domain}"
    - Requires date parameter (in YYYY-MM-DD format) in the URL

    Args: url: URL to validate (must be absolute URL with scheme and date parameter)
    Raises: ValueError: If the URL is from a disallowed domain or is not absolute or does not include a date parameter
    """
    parsed = urlparse(url)

    if not parsed.scheme:
        raise ValueError(
            "URL must be absolute (include scheme like http:// or https://). "
            "Relative URLs are not allowed for security reasons."
        )

    query_params = parse_qs(parsed.query, keep_blank_values=True)
    if "date" not in query_params:
        raise ValueError(f"URL missing 'date' parameter: {url}")
    date_value = query_params["date"][0]
    try:
        datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Date parameter '{date_value}' is not in YYYY-MM-DD format")

    hostname = parsed.hostname

    if parsed.scheme == "file":
        return
    if not hostname:
        raise ValueError("URL must include a hostname.")
    if hostname in ("localhost", "127.0.0.1", "::1"):
        return
    if not EXPORT_ALLOWED_DOMAINS:
        raise ValueError(
            "No allowed domains configured. Contact administrator to add domains to EXPORT_ALLOWED_DOMAINS constant."
        )

    hostname_lower = hostname.lower()
    is_allowed = False

    for domain in EXPORT_ALLOWED_DOMAINS:
        domain_lower = domain.lower()

        # Handle glob patterns with wildcards anywhere (e.g., staging-prism-frontend--*.web.app)
        if "*" in domain_lower and not domain_lower.startswith("*."):
            if fnmatch.fnmatch(hostname_lower, domain_lower):
                is_allowed = True
                break
        # Handle subdomain wildcards (e.g., *.wfp.org)
        elif domain_lower.startswith("*."):
            base_domain = domain_lower[2:]
            if hostname_lower == base_domain or hostname_lower.endswith(
                f".{base_domain}"
            ):
                is_allowed = True
                break
        # Handle exact domain matches
        else:
            if hostname_lower == domain_lower or hostname_lower.endswith(
                f".{domain_lower}"
            ):
                is_allowed = True
                break

    if not is_allowed:
        raise ValueError(
            f"Domain '{hostname}' is not allowed. Allowed domains: {', '.join(EXPORT_ALLOWED_DOMAINS)}"
        )


def extract_dates_from_urls(urls: list[str]) -> list[str]:
    """
    Extract dates from URLs.
    """
    dates = []
    for url in urls:
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query, keep_blank_values=True)
        dates.append(query_params["date"][0])
    return dates


async def render_single_map(
    browser: Browser,
    url: str,
    viewport_width: int,
    viewport_height: int,
    render_format: str,
) -> bytes:
    """
    Render a single map using an existing browser instance and return the image/PDF bytes.
    Retries up to MAX_RENDER_RETRIES times on timeout before raising an error.
    Args:
        browser: Playwright browser instance to use for rendering
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
        page = await browser.new_page()
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
    browser: Browser,
    url: str,
    viewport_width: int,
    viewport_height: int,
    render_format: str,
    output_path: Path,
    semaphore: asyncio.Semaphore,
) -> None:
    """
    Render a single map and write directly to a file.

    This reduces memory pressure by not holding all rendered bytes in memory.

    Args:
        browser: Playwright browser instance to use for rendering
        url: URL to render (should include all map parameters)
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        render_format: Render format ('pdf' for PDF, 'png' for PNG screenshot)
        output_path: Path to write the rendered output
        semaphore: Semaphore for limiting concurrent renders
    """
    async with semaphore:
        result_bytes = await render_single_map(
            browser, url, viewport_width, viewport_height, render_format
        )
        output_path.write_bytes(result_bytes)


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
    logger.info(
        f"Rendering {len(urls)} maps with {MAX_CONCURRENT_RENDERS} concurrent renders"
    )
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_RENDERS)
    logger.info(f"Timing: Setup completed in {time.time() - setup_start:.2f}s")

    # Step 2: Get browser instance
    browser_start = time.time()
    browser = await get_browser()
    logger.info(f"Timing: Browser ready in {time.time() - browser_start:.2f}s")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        file_extension = "pdf" if format_type == "pdf" else "png"

        output_paths = [
            tmpdir_path / f"map_{i}_{date}.{file_extension}"
            for i, date in enumerate(dates)
        ]

        # Step 3: Render all maps
        render_start = time.time()
        render_tasks = [
            render_to_file(
                browser,
                url,
                viewport_width,
                viewport_height,
                format_type,
                output_path,
                semaphore,
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
