"""A set of functions to validate and parse API request parameters."""

import operator as op
import re
from typing import Any, Tuple

from fastapi import HTTPException

# GDAL --calc is evaluated by Python. Keep this to band arithmetic so a value
# cannot escape into the shell or into attribute/call syntax inside that eval.
# Production expressions: "A*(B==1)" (default) and "A*(B>=3)" (exposure layers).
_MAX_MASK_CALC_EXPR_LEN = 256
_MASK_CALC_EXPR = re.compile(
    r"(?:"
    r"[A-Z]"
    r"|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?"
    r"|\*\*|//|==|!=|<=|>=|[+\-*/%<>=!()]"
    r"| "
    r")+"
)


class InvalidMaskCalcExpr(ValueError):
    """mask_calc_expr is not a plain GDAL band expression."""


def validate_mask_calc_expr(expr: str) -> str:
    """Accept a GDAL calc expression made of bands, numbers, and operators."""
    if (
        not isinstance(expr, str)
        or len(expr) > _MAX_MASK_CALC_EXPR_LEN
        or not _MASK_CALC_EXPR.fullmatch(expr)
        or not re.search(r"[A-Z0-9]", expr)
    ):
        raise InvalidMaskCalcExpr(
            "mask_calc_expr must be a GDAL calc expression using bands A-Z, "
            "numbers, and arithmetic or comparison operators"
        )
    return expr


VALID_OPERATORS = {
    "<=": op.le,
    ">=": op.ge,
    "<": op.lt,
    ">": op.gt,
    "!=": op.ne,
    "==": op.eq,
    "=": op.eq,
}


def validate_intersect_parameter(intersect_comparison_string: str) -> Tuple[Any, float]:
    """Validate intersect parameter and return a (comparator, baseline) tuple."""
    # extract an intersect comparison operator
    default_operator = ("=", op.eq)
    operator_item = next(
        (
            op
            for op in VALID_OPERATORS.items()
            if op[0] in intersect_comparison_string[:2]
        ),
        default_operator,
    )

    # remove the operator from our string
    intersect_comparison_string = intersect_comparison_string.replace(
        operator_item[0], ""
    )

    try:
        baseline = float(intersect_comparison_string)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid intersect_comparison format {intersect_comparison_string}. "
                "Expecting a float."
            ),
        )
    return (operator_item[1], baseline)
