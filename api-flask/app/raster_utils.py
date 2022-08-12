"""Raster utilility function for reprojection."""
import os

import logging
from rasterio.warp import reproject, Resampling, calculate_default_transform
import rasterio

logger = logging.getLogger(__name__)


def gdal_calc(input_file_path, mask_file, output_file_path, calc_expr='"A*(B==0)"'):
    """Utility function to run gdal_calc with two rasters."""
    gdal_calc_path = os.path.join('gdal_calc.py')
    nodata = '0'

    # Generate string of process.
    gdal_calc_str = '{0} -A {1} -B {2} --outfile={3} --calc={4} --NoDataValue={5} > /dev/null'
    gdal_calc_process = gdal_calc_str.format(gdal_calc_path, input_file_path, mask_file,
        output_file_path, calc_expr, nodata)

    logger.debug(gdal_calc_process)

    # Call process.
    os.system(gdal_calc_process)


def reproj_match(infile, match, outfile, resampling_mode=Resampling.sum):
    """Reproject a file to match the shape and projection of existing raster.

    Parameters
    ----------
    infile : (string) path to input file to reproject
    match : (string) path to raster with desired shape and projection
    outfile : (string) path to output file tif
    """
    # open input
    with rasterio.open(infile) as src:

        # open input to match
        with rasterio.open(match) as match:
            dst_crs = match.crs

            # calculate the output transform matrix
            dst_transform, dst_width, dst_height = calculate_default_transform(
                src.crs,     # input CRS
                dst_crs,     # output CRS
                match.width,   # input width
                match.height,  # input height
                *match.bounds,  # unpacks input outer boundaries (left, bottom, right, top)
            )

        dst_width = match.width
        dst_height = match.height

        # set properties for output
        dst_kwargs = src.meta.copy()
        dst_kwargs.update({"crs": dst_crs,
                           "transform": dst_transform,
                           "width": dst_width,
                           "height": dst_height,
                           "nodata": 0})
        print("Coregistered to shape:", dst_height,dst_width,'\n Affine',dst_transform)
        # open output
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
                    # mode resampling method
                    resampling=resampling_mode)
