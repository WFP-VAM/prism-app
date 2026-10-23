"""mask_calc_expr must stay a GDAL band expression and must not reach a shell."""

from unittest.mock import patch

import pytest
from prism_app.models import StatsModel
from prism_app.raster_utils import gdal_calc
from prism_app.validation import InvalidMaskCalcExpr, validate_mask_calc_expr
from pydantic import ValidationError

_KNOWN_EXPRESSIONS = [
    "A*(B==1)",
    "A*(B>=3)",
    "A*(B>0)",
    "A*(B!=0)",
    "A * (B <= 3)",
    "(A+B)/2",
    "A*(B>=1.5)",
]


@pytest.mark.parametrize("expr", _KNOWN_EXPRESSIONS)
def test_validate_mask_calc_expr_accepts_band_math(expr):
    assert validate_mask_calc_expr(expr) == expr


@pytest.mark.parametrize(
    "expr",
    [
        "A*(B==1);echo",
        "A`id`",
        "$(id)",
        "A\nB",
        "A.__class__",
        "__import__('os')",
        'A*(B==1)"',
        "logical_and(A,B)",
        " ",
        "A" * 300,
    ],
)
def test_validate_mask_calc_expr_rejects_non_band_math(expr):
    with pytest.raises(InvalidMaskCalcExpr):
        validate_mask_calc_expr(expr)


def _stats(**overrides):
    payload = {
        "geotiff_url": "https://example.com/a.tif",
        "zones_url": "https://example.com/zones.json",
    }
    payload.update(overrides)
    return StatsModel(**payload)


@pytest.mark.parametrize("expr", [None, "", "A*(B==1)", "A*(B>=3)"])
def test_stats_model_accepts_current_mask_calc_expr(expr):
    model = _stats(mask_calc_expr=expr)
    assert model.mask_calc_expr == expr


def test_stats_model_rejects_unsafe_mask_calc_expr():
    with pytest.raises(ValidationError):
        _stats(mask_calc_expr="A*(B==1);echo")


@patch("prism_app.raster_utils.subprocess.check_call")
@patch("prism_app.raster_utils.os.path.isfile", return_value=True)
@patch("prism_app.raster_utils.shutil.which", return_value="/usr/bin/gdal_calc.py")
def test_gdal_calc_passes_argv_without_shell(_which, _isfile, check_call):
    gdal_calc("/tmp/a.tif", "/tmp/b.tif", "/tmp/out.tif", calc_expr="A*(B>=3)")

    args, kwargs = check_call.call_args
    cmd = args[0]
    assert isinstance(cmd, list)
    assert kwargs["shell"] is False
    assert kwargs["stdout"] is not None
    assert "--calc=A*(B>=3)" in cmd
    assert "-A" in cmd and "-B" in cmd
    assert all(";" not in part and "`" not in part for part in cmd)


@patch("prism_app.raster_utils.subprocess.check_call")
@patch("prism_app.raster_utils.os.path.isfile", return_value=True)
@patch("prism_app.raster_utils.shutil.which", return_value="/usr/bin/gdal_calc.py")
def test_gdal_calc_defaults_expression_and_skips_shell_on_reject(
    _which, _isfile, check_call
):
    gdal_calc("/tmp/a.tif", "/tmp/b.tif", "/tmp/out.tif", calc_expr=None)
    cmd = check_call.call_args.args[0]
    assert "--calc=A*(B==1)" in cmd

    check_call.reset_mock()
    with pytest.raises(InvalidMaskCalcExpr):
        gdal_calc("/tmp/a.tif", "/tmp/b.tif", "/tmp/out.tif", calc_expr="A;id")
    check_call.assert_not_called()
