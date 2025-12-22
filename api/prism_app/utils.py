import fnmatch
import logging
from datetime import datetime
from typing import Final
from urllib.parse import parse_qs, urlparse

import requests
from fastapi import HTTPException
from requests.adapters import Retry

logger = logging.getLogger(__name__)


def forward_http_error(resp: requests.Response, excluded_codes: list[int]) -> None:
    if not resp.status_code > 399:
        return

    if excluded_codes and resp.status_code in excluded_codes:
        raise HTTPException(status_code=500, detail="An internal error occurred.")
    else:
        obj = resp.json()
        detail = obj.get("detail", "Unknown error")
        raise HTTPException(status_code=resp.status_code, detail=detail)


class WarningsFilter(logging.Filter):
    """Custom logging filter for warnings."""

    def __init__(self):
        super().__init__()
        self.max_warnings = 1
        self.warning_count = 0

    def filter(self, record):
        if (
            self.warning_count >= self.max_warnings
            and record.levelno == logging.WARNING
            and "converting a masked element to nan" in record.getMessage()
        ):
            return True
        if (
            record.levelno == logging.WARNING
            and "converting a masked element to nan" in record.getMessage()
        ):
            self.warning_count += 1

        return False


def make_request_with_retries(
    url: str,
    method: str = "get",
    data: dict = None,
    retries: int = 1,
    timeout: int = 10,
) -> dict:
    """Make a request with retries and error handling."""
    retry_strategy = Retry(
        total=retries,
        backoff_factor=0.25,
        status_forcelist=[429, 500, 502, 503, 504],
    )

    with requests.Session() as session:
        adapter = requests.adapters.HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)

        try:
            if method.lower() == "post":
                response = session.post(url, json=data, timeout=timeout)
            else:
                response = session.get(url, timeout=timeout)

            response.raise_for_status()
            response_data = response.json()

        except requests.exceptions.RequestException as e:
            logger.warning("Request failed at url %s: %s", url, e)
            raise HTTPException(
                status_code=500, detail=f"Error fetching data from {url}"
            )

        if "error" in response_data:
            logger.error("Error in response: %s", response_data["error"])
            raise HTTPException(
                status_code=500, detail=f"Error fetching data from {url}"
            )

        return response_data


# Allowed domains for export URLs
# Add domains to this list to allow them for map exports
EXPORT_ALLOWED_DOMAINS: Final[list[str]] = [
    "*.wfp.org",
    "staging-prism-frontend--*.web.app",  # Firebase preview builds
]


def is_domain_allowed(hostname: str, allowed_domains: list[str]) -> bool:
    """
    Check if a hostname matches any of the allowed domain patterns.

    Supports three pattern types:
    - Glob patterns with wildcards anywhere (e.g., staging-prism-frontend--*.web.app)
    - Subdomain wildcards (e.g., *.wfp.org matches wfp.org and any subdomain)
    - Exact domain matches (matches domain and any subdomain)

    Args:
        hostname: The hostname to check (e.g., "prism.wfp.org")
        allowed_domains: List of allowed domain patterns
    Returns: True if hostname matches any allowed pattern, False otherwise
    """
    hostname_lower = hostname.lower()

    for domain in allowed_domains:
        domain_lower = domain.lower()

        # Handle glob patterns with wildcards anywhere
        if "*" in domain_lower and not domain_lower.startswith("*."):
            if fnmatch.fnmatch(hostname_lower, domain_lower):
                return True
        # Handle subdomain wildcards (e.g., *.wfp.org)
        elif domain_lower.startswith("*."):
            base_domain = domain_lower[2:]
            if hostname_lower == base_domain or hostname_lower.endswith(
                f".{base_domain}"
            ):
                return True
        # Handle exact domain matches
        else:
            if hostname_lower == domain_lower or hostname_lower.endswith(
                f".{domain_lower}"
            ):
                return True

    return False


def validate_export_url(url: str) -> None:
    """
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
    Raises: ValueError if the URL is from a disallowed domain, is not absolute,
    or does not include a valid date parameter
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
            "No allowed domains configured. Contact administrator to add domains "
            "to EXPORT_ALLOWED_DOMAINS constant."
        )

    if not is_domain_allowed(hostname, EXPORT_ALLOWED_DOMAINS):
        raise ValueError(
            f"Domain '{hostname}' is not allowed. "
            f"Allowed domains: {', '.join(EXPORT_ALLOWED_DOMAINS)}"
        )


def extract_dates_from_urls(urls: list[str]) -> list[str]:
    """
    Extract date parameters from a list of URLs.
    Args: urls: List of URLs containing 'date' query parameters
    Returns: List of date strings extracted from the URLs
    """
    dates = []
    for url in urls:
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query, keep_blank_values=True)
        dates.append(query_params["date"][0])
    return dates
