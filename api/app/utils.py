import logging

import requests
from fastapi import HTTPException
from requests.adapters import Retry

logger = logging.getLogger(__name__)

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
