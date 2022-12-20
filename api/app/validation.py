"""A set of functions to validate and parse API request parameters."""
import operator as op
from typing import Any, Tuple

from fastapi import HTTPException

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
