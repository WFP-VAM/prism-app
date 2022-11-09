"""Raster utilility functions for reprojection and calculation."""
import logging
import os
import subprocess

import rasterio
from app.timer import timed
from rasterio.warp import Resampling, calculate_default_transform, reproject

from .models import FilePath

logger = logging.getLogger(__name__)


@timed
def gdal_calc(
    input_file_path,
    mask_file_path,
    output_file_path,
    calc_expr=None,
    nodata="0",
):
    """Utility function to run gdal_calc between two rasters."""
    gdal_calc_path = os.path.join("/usr/bin/", "gdal_calc.py")

    # Add a proper default for the calculation expression
    calc_expr = calc_expr or "A*(B==1)"

    # Generate string of process.
    gdal_calc_str = '{0} -A {1} -B {2} --outfile={3} --calc="{4}" --NoDataValue={5} --extent=intersect --overwrite > /dev/null'
    gdal_calc_process = gdal_calc_str.format(
        gdal_calc_path,
        input_file_path,
        mask_file_path,
        output_file_path,
        calc_expr,
        nodata,
    )

    logger.debug("Calling gdal_calc.py...")
    logger.debug(gdal_calc_process)

    # TODO - secure call input or remove shell=True
    subprocess.check_call(str(gdal_calc_process), shell=True)


@timed
def reproj_match(
    infile: FilePath,
    matchfile: FilePath,
    outfile: FilePath,
    resampling_mode=Resampling.sum,
):
    """Reproject a file to match the shape and projection of existing raster.

    Parameters
    ----------
    infile : (string) path to input file to reproject
    match : (string) path to raster with desired shape and projection
    outfile : (string) path to output file tif
    """
    with rasterio.open(infile) as src:
        with rasterio.open(matchfile) as match:
            dst_crs = match.crs
            # calculate the output transform matrix
            dst_transform, dst_width, dst_height = calculate_default_transform(
                src.crs,  # input CRS
                dst_crs,  # output CRS
                match.width,  # match width
                match.height,  # match height
                *match.bounds,  # unpacks input outer boundaries (left, bottom, right, top)
                resolution=match.res,  # ensure matching pixel size
            )

        # set properties for output
        dst_kwargs = src.meta.copy()
        dst_kwargs.update(
            {
                "crs": dst_crs,
                "transform": dst_transform,
                "width": dst_width,
                "height": dst_height,
                "nodata": 0,
            }
        )

        logger.debug(("Coregistered to shape:", dst_height, dst_width))
        logger.debug(("Affine", dst_transform))

        with rasterio.open(outfile, "w+", **dst_kwargs) as dst:
            # iterate through bands and write using reproject function
            for i in range(1, src.count + 1):
                reproject(
                    source=rasterio.band(src, i),
                    destination=rasterio.band(dst, i),
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=dst_transform,
                    dst_crs=dst_crs,
                    resampling=resampling_mode,
                )
