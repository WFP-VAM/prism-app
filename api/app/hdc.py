"""Get data from Humanitarian Data Cube (HDC) API"""

import logging
from os import getenv

import requests

logger = logging.getLogger(__name__)

hdc_token = getenv("HDC_TOKEN", "")
if hdc_token == "":
    logger.warning("Missing backend parameter: HDC_TOKEN")


def get_hdc_stats(
    level: str, admin_id: str, coverage: str, vam: str, start: str, end: str
):
    """Get statistical charts data"""
    url = "https://api.wfp.org/hdc/1.0.0/stats/admin"
    params = {
        "level": level,
        "id_code": admin_id,
        "coverage": coverage,
        "vam": vam,
        "start": start,
        "end": end,
    }
    response = requests.get(
        url,
        params=params,
        headers={"Authorization": f"Bearer {hdc_token}", "Accept": "application/json"},
    )
    response.raise_for_status()
    return response.json()
