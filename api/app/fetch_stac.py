# Source: https://odc-stac.readthedocs.io/en/latest/notebooks/stac-load-S2-deafrica.html
# + odc.geo

from odc.geo.xr import write_cog
from odc.stac import configure_rio, stac_load
from pystac_client import Client

config = {
    "s2_l2a": {
        "assets": {
            "*": {
                "data_type": "uint16",
                "nodata": 0,
                "unit": "1",
            },
            "SCL": {
                "data_type": "uint8",
                "nodata": 0,
                "unit": "1",
            },
        },
        "aliases": {
            "costal_aerosol": "B01",
            "blue": "B02",
            "green": "B03",
            "red": "B04",
            "red_edge_1": "B05",
            "red_edge_2": "B06",
            "red_edge_3": "B07",
            "nir": "B08",
            "nir_narrow": "B08A",
            "water_vapour": "B09",
            "swir_1": "B11",
            "swir_2": "B12",
            "mask": "SCL",
            "aerosol_optical_thickness": "AOT",
            "scene_average_water_vapour": "WVP",
        },
    }
}

configure_rio(
    cloud_defaults=True,
    aws={"aws_unsigned": True},
    AWS_S3_ENDPOINT="s3.af-south-1.amazonaws.com",
)

root_url = "https://explorer.digitalearth.africa/stac"
# Open the stac catalogue
catalog = Client.open(root_url)

# Set a bounding box
# [xmin, ymin, xmax, ymax] in latitude and longitude
bbox = [37.76, 12.49, 37.77, 12.50]
# Set a start and end date
start_date = "2020-09-01"
end_date = "2020-12-01"

# Set the STAC collections
collections = ["s2_l2a"]

# Build a query with the set parameters
query = catalog.search(
    bbox=bbox, collections=collections, datetime=f"{start_date}/{end_date}"
)

# Search the STAC catalog for all items matching the query
items = list(query.items())

crs = "EPSG:6933"
resolution = 20

ds = stac_load(
    items,
    bands=("red", "green", "blue", "nir"),
    crs=crs,
    resolution=resolution,
    chunks={},
    groupby="solar_day",
    stac_cfg=config,
    bbox=bbox,
)

computed = ds.red.compute()
write_cog(ds.red, "test.tif")
