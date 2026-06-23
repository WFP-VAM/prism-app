"""BBox helpers aligned with ``common/src/utils/bbox.ts`` and ``image.ts``."""

from __future__ import annotations

from typing import Sequence

BBOX = Sequence[float]


def check_extent(extent: BBOX) -> None:
    min_x, min_y, max_x, max_y = extent
    if min_x > max_x or min_y > max_y:
        raise ValueError(
            f"the extent {extent!r} seems malformed or else may contain "
            '"wrapping" which is not supported',
        )


def scale_image(
    extent: BBOX,
    *,
    resolution: int = 256,
    max_pixels: int = 5096,
    do_check_extent: bool = True,
) -> tuple[int, int]:
    if do_check_extent:
        check_extent(extent)
    min_x, min_y, max_x, max_y = extent
    x_range = max_x - min_x
    y_range = max_y - min_y
    max_dim = min(max_pixels, x_range * resolution, y_range * resolution)
    scale = max_dim / max(x_range, y_range)
    width = int((x_range * scale) + 0.99999)
    height = int((y_range * scale) + 0.99999)
    return width, height


def bbox_to_string(
    bbox: BBOX,
    bbox_digits: int | None = None,
) -> str:
    xmin, ymin, xmax, ymax = bbox
    if bbox_digits is not None:
        parts = [
            f"{float(xmin):.{bbox_digits}f}",
            f"{float(ymin):.{bbox_digits}f}",
            f"{float(xmax):.{bbox_digits}f}",
            f"{float(ymax):.{bbox_digits}f}",
        ]
    else:
        parts = [str(xmin), str(ymin), str(xmax), str(ymax)]
    return ",".join(parts)
