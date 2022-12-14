import os
from uuid import uuid4

from odc.geo.xr import write_cog
from odc.stac import configure_rio, stac_load
from pystac_client import Client

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

configure_rio(
    cloud_defaults=True,
    aws={
        "aws_access_key_id": AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
    },
)

stac_url = "https://api.earthobservation.vam.wfp.org/stac"


def generate_geotiff_from_stac_api(
    collection: str, bbox: [float, float, float, float], date: str
) -> str:
    file_path = f"{collection}_{date}_{str(uuid4())[:8]}.tif"
    catalog = Client.open(stac_url)

    query_answer = catalog.search(bbox=bbox, collections=[collection], datetime=[date])
    items = list(query_answer.items())

    if not items:
        raise ValueError("Collection not found in stac API")

    collections_dataset = stac_load(
        items,
        bbox=bbox,
    )

    write_cog(collections_dataset[list(collections_dataset.keys())[0]], file_path)

    return file_path
