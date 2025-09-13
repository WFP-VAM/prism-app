import os
import tempfile

import pytest
import rasterio
from prism_app.raster_utils import get_raster_crs, reproject_raster


def test_reproject_raster():
    """Test the reproject_raster function."""
    # Define the path to the sample GeoTIFF file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sample_tiff_path = os.path.join(
        current_dir, "raster_sample_not-norm_projection.tif"
    )

    # Create a temporary directory to store the output file
    with tempfile.TemporaryDirectory() as temp_dir:
        # Define the output file path
        output_file = os.path.join(temp_dir, "output.tif")

        # Reproject the raster to a new CRS (EPSG:3857)
        dst_crs = "EPSG:3857"
        reproject_raster(sample_tiff_path, dst_crs, output_file)

        # Verify that the output file has the correct CRS
        assert os.path.exists(output_file)
        output_crs = get_raster_crs(output_file)
        assert output_crs == rasterio.crs.CRS.from_epsg(3857)
