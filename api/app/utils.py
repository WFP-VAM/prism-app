from ast import literal_eval
import logging

import requests
from fastapi import HTTPException


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
