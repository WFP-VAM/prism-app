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
