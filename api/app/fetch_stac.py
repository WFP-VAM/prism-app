import os
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

root_url = "https://api.earthobservation.vam.wfp.org/stac"
# Open the stac catalogue
catalog = Client.open(root_url)

# Set a bounding box
# [xmin, ymin, xmax, ymax] in latitude and longitude
bbox = [10, -71, 21, 71]
# Set a start and end date
start_date = "2020-09-01"
end_date = "2020-12-01"

# Set the STAC collections
collections = ["r3h_dekad"]

# Build a query with the set parameters
query = catalog.search(
    bbox=bbox, collections=collections, datetime=f"{start_date}/{end_date}"
)

# Search the STAC catalog for all items matching the query
items = list(query.items())

ds = stac_load(
    items,
    bbox=bbox,
)

write_cog(ds.band, "test.tif")
