"""Map export functionality using Playwright for server-side rendering."""

import asyncio
import fnmatch
import io
import logging
import zipfile
from datetime import datetime
from typing import Final, Tuple
from urllib.parse import parse_qs, urlparse

from playwright.async_api import Browser, TimeoutError as PlaywrightTimeoutError, async_playwright
from pypdf import PdfReader, PdfWriter

from .models import AspectRatio, ExportFormat

logger = logging.getLogger(__name__)

# Timeouts
PAGE_TIMEOUT: Final[int] = 60000
PRISM_READY_TIMEOUT: Final[int] = 30000

# Viewport settings
BASE_WIDTH: Final[int] = 1200
DEVICE_SCALE_FACTOR: Final[int] = 2

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


def get_viewport_dimensions(aspect_ratio: AspectRatio) -> Tuple[int, int]:
    """
    Convert aspect ratio string to pixel dimensions.

    Dynamically parses aspect ratio strings in "W:H" format

    Args: aspect_ratio: Aspect ratio string in "W:H" format
    Returns: Tuple of (width, height) in pixels
    """
    try:
        parts = aspect_ratio.split(":")
        if len(parts) != 2:
            raise ValueError("Invalid format")
        width_ratio = int(parts[0])
        height_ratio = int(parts[1])
        if width_ratio <= 0 or height_ratio <= 0:
            raise ValueError("Ratios must be positive")
    except (ValueError, AttributeError):
        raise ValueError(
            f"Invalid aspect ratio: {aspect_ratio}. Expected format 'W:H' (e.g., '3:4')"
        )

    height = int(BASE_WIDTH * (height_ratio / width_ratio))
    return (BASE_WIDTH, height)


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

    TODO: Add handling for 400 style errors in PRISM frontend and remove from bundled export.

    Args:
        browser: Playwright browser instance to use for rendering
        url: URL to render (should include all map parameters)
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        render_format: Render format ('pdf' for PDF, 'png' for PNG screenshot)

    Returns:
        Bytes of the rendered map (PNG or PDF)
    """
    console_messages: list[str] = []
    page = await browser.new_page()
    page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
    page.set_default_timeout(PAGE_TIMEOUT)
    await page.set_viewport_size({"width": viewport_width, "height": viewport_height})
    await page.emulate_media(media="screen")
    url = url.replace("localhost:3000", "host.docker.internal:3000")
    await page.goto(url)

    # Wait for PRISM_READY flag (set by frontend after map tiles are loaded)
    try:
        await page.wait_for_function("window.PRISM_READY === true", timeout=PRISM_READY_TIMEOUT)
    except PlaywrightTimeoutError:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        await page.screenshot(path=f"/tmp/prism_debug_{timestamp}.png", full_page=True)
        logger.error(f"Timeout on {url}. Console: {console_messages}. Screenshot: /tmp/prism_debug_{timestamp}.png")
        await page.close()
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


async def export_maps(
    urls: list[str], aspect_ratio: AspectRatio, format_type: ExportFormat
) -> Tuple[bytes, str]:
    """
    Export maps for multiple dates and return packaged file.

    Uses a single browser instance and renders maps with limited concurrency.

    Args:
        urls: List of base URLs with map parameters
        aspect_ratio: Aspect ratio string ('1:1', '3:4', or '4:3')
        format_type: Output format ('pdf' or 'zip')
    Returns: Tuple of (file_bytes, content_type)
    """
    dates = extract_dates_from_urls(urls)
    viewport_width, viewport_height = get_viewport_dimensions(aspect_ratio)
    semaphore = asyncio.Semaphore(4)  # Limit to 4 concurrent renders

    async def render_with_limit(url: str) -> bytes:
        async with semaphore:
            return await render_single_map(browser, url, viewport_width, viewport_height, format_type)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        bytes_list = await asyncio.gather(*[render_with_limit(url) for url in urls])
        await browser.close()

    # Package results
    if format_type == "pdf":
        # Merge PDFs
        pdf_writer = PdfWriter()
        for pdf_bytes in bytes_list:
            pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)

        # Write merged PDF to bytes
        output_buffer = io.BytesIO()
        pdf_writer.write(output_buffer)
        result = (output_buffer.getvalue(), "application/pdf")
    else:  # png format
        # Create ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for date, png_bytes in zip(dates, bytes_list):
                filename = f"map_{date}.png"
                zip_file.writestr(filename, png_bytes)
        result = (zip_buffer.getvalue(), "application/zip")

    return result
