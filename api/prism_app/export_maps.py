"""Map export functionality using Playwright for server-side rendering."""

import asyncio
import io
import zipfile
from typing import Final, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter

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
]


def validate_export_url(url: str) -> None:
    """
    Validate that the export URL is from an allowed domain.

    Validation rules:
    - Requires absolute URLs (must have scheme like http:// or https://)
    - Relative URLs are not allowed for security reasons
    - Allows file:// URLs (for local testing)
    - Requires hostname for non-file URLs
    - Allows localhost with any port (localhost, 127.0.0.1, ::1)
    - Checks against EXPORT_ALLOWED_DOMAINS list
    - Supports wildcard patterns like *.wfp.org (matches all subdomains)
    - Supports exact domain matches (e.g., "wfp.org" matches "wfp.org" and "example.wfp.org")
    - For wildcard patterns, extracts base domain (e.g., "wfp.org" from "*.wfp.org")
    - Matches if hostname equals base domain or ends with ".{base_domain}"

    Args: url: URL to validate (must be absolute URL with scheme)
    Raises: ValueError: If the URL is from a disallowed domain or is not absolute
    """
    parsed = urlparse(url)

    if not parsed.scheme:
        raise ValueError(
            "URL must be absolute (include scheme like http:// or https://). "
            "Relative URLs are not allowed for security reasons."
        )

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

        if domain_lower.startswith("*."):
            base_domain = domain_lower[2:]
            if hostname_lower == base_domain or hostname_lower.endswith(
                f".{base_domain}"
            ):
                is_allowed = True
                break
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


def get_viewport_dimensions(aspect_ratio: str) -> Tuple[int, int]:
    """
    Convert aspect ratio string to pixel dimensions.

    Args: aspect_ratio: Aspect ratio string ('1:1', '3:4', or '4:3')
    Returns: Tuple of (width, height) in pixels
    """
    ratio_map = {
        "1:1": (1, 1),
        "3:4": (3, 4),
        "4:3": (4, 3),
    }

    if aspect_ratio not in ratio_map:
        raise ValueError(f"Invalid aspect ratio: {aspect_ratio}")

    width_ratio, height_ratio = ratio_map[aspect_ratio]
    height = int(BASE_WIDTH * (height_ratio / width_ratio))

    return (BASE_WIDTH, height)


def modify_url_for_date(url: str, date: str) -> str:
    """
    Modify URL to include or update the date parameter.

    Args:
        url: Base URL with query parameters
        date: Date string in YYYY-MM-DD format
    Returns: Modified URL with date parameter
    """
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query, keep_blank_values=True)
    query_params["date"] = [date]

    # Reconstruct URL
    new_query = urlencode(query_params, doseq=True)
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment,
        )
    )


async def render_single_map(
    url: str, viewport_width: int, viewport_height: int, render_format: str
) -> bytes:
    """
    Render a single map using Playwright and return the image/PDF bytes.

    Args:
        url: URL to render (should include all map parameters)
        viewport_width: Browser viewport width in pixels
        viewport_height: Browser viewport height in pixels
        render_format: Render format ('pdf' for PDF, 'png' for PNG screenshot)

    Returns:
        Bytes of the rendered map (PNG or PDF)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.set_default_timeout(PAGE_TIMEOUT)
        await page.set_viewport_size(
            {"width": viewport_width, "height": viewport_height}
        )
        await page.emulate_media(media="screen")
        await page.goto(url)

        # Wait for PRISM_READY flag
        await page.wait_for_function(
            "window.PRISM_READY === true",
            timeout=PRISM_READY_TIMEOUT,
        )

        # Additional wait for network to be idle to ensure tiles are loaded
        await page.wait_for_load_state("networkidle", timeout=PAGE_TIMEOUT)

        # Capture screenshot or PDF
        if render_format == "pdf":
            pdf_bytes = await page.pdf(
                width=f"{viewport_width}px",
                height=f"{viewport_height}px",
                print_background=True,
            )
            await browser.close()
            return pdf_bytes
        else:  # PNG
            screenshot_bytes = await page.screenshot(
                type="png",
                full_page=True,
            )
            await browser.close()
            return screenshot_bytes


async def export_maps(
    url: str, dates: list[str], aspect_ratio: str, format_type: str
) -> Tuple[bytes, str]:
    """
    Export maps for multiple dates and return packaged file.

    Renders maps in parallel for better performance when processing multiple dates.

    Args:
        url: Base URL with map parameters (date will be added/modified per date)
        dates: List of ISO-8601 date strings
        aspect_ratio: Aspect ratio string ('1:1', '3:4', or '4:3')
        format_type: Output format ('pdf' or 'zip')
    Returns: Tuple of (file_bytes, content_type)
    """
    viewport_width, viewport_height = get_viewport_dimensions(aspect_ratio)
    date_urls = [modify_url_for_date(url, date_str) for date_str in dates]

    if format_type == "pdf":
        # Render all dates in parallel
        render_format = "pdf"
        pdf_bytes_list = await asyncio.gather(
            *[
                render_single_map(
                    date_url, viewport_width, viewport_height, render_format
                )
                for date_url in date_urls
            ]
        )

        # Merge PDFs
        pdf_writer = PdfWriter()
        for pdf_bytes in pdf_bytes_list:
            pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)

        # Write merged PDF to bytes
        output_buffer = io.BytesIO()
        pdf_writer.write(output_buffer)
        return (output_buffer.getvalue(), "application/pdf")

    else:  # zip format
        # Render all dates in parallel
        render_format = "png"
        png_bytes_list = await asyncio.gather(
            *[
                render_single_map(
                    date_url, viewport_width, viewport_height, render_format
                )
                for date_url in date_urls
            ]
        )

        # Create ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for date_str, png_bytes in zip(dates, png_bytes_list):
                filename = f"map_{date_str}.png"
                zip_file.writestr(filename, png_bytes)

        return (zip_buffer.getvalue(), "application/zip")
