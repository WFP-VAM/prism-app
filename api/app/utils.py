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


# Define a flag to indicate if the warning has been recorded already
warning_recorded = False
logger = logging.getLogger("zonal_stats")


def custom_warning_handler(message, category, filename, lineno, file=None, line=None):
    global warning_recorded
    if warning_recorded and "converting a masked element to nan" in str(message):
        return

    if "converting a masked element to nan" in str(message):
        warning_recorded = True

    logger.warning(message)
