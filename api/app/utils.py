from ast import literal_eval

import requests
from fastapi import HTTPException


def forward_http_error(resp: requests.Response, excluded_codes: list[int]) -> None:
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as exc:
        code = exc.response.status_code
        if excluded_codes and code in excluded_codes:
            raise HTTPException(
                status_code=500, detail="An internal error occurred."
            ) from exc
        obj = literal_eval(exc.response.content.decode("ASCII"))
        detail = obj.get("detail", "Unknown error")
        raise HTTPException(status_code=code, detail=detail) from exc
