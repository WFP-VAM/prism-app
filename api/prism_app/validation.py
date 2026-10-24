"""A set of functions to validate and parse API request parameters."""

import ast
import operator as op
from typing import Any, Tuple

from fastapi import HTTPException

# gdal_calc.py evals --calc as Python. ast is the parser for that language.
# Allow only band arithmetic. Calls and attribute access stay rejected because
# that eval would run them. Production expressions: "A*(B==1)" and "A*(B>=3)".
_MAX_MASK_CALC_EXPR_LEN = 256
# Exponentiation is omitted: 9**9**9 is valid Python and unbounded to eval.
_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod)
_CMPOPS = (ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE)
_UNARYOPS = (ast.UAdd, ast.USub)


class InvalidMaskCalcExpr(ValueError):
    """mask_calc_expr is not a plain GDAL band expression."""


def _invalid_mask_calc_expr() -> InvalidMaskCalcExpr:
    return InvalidMaskCalcExpr(
        "mask_calc_expr must be a GDAL calc expression using bands A-Z, "
        "numbers, and arithmetic or comparison operators"
    )


def _check_mask_calc_node(node: ast.AST) -> None:
    if isinstance(node, ast.Expression):
        _check_mask_calc_node(node.body)
    elif isinstance(node, ast.BinOp) and isinstance(node.op, _BINOPS):
        _check_mask_calc_node(node.left)
        _check_mask_calc_node(node.right)
    elif isinstance(node, ast.UnaryOp) and isinstance(node.op, _UNARYOPS):
        _check_mask_calc_node(node.operand)
    elif isinstance(node, ast.Compare) and all(
        isinstance(cmp_op, _CMPOPS) for cmp_op in node.ops
    ):
        _check_mask_calc_node(node.left)
        for comparator in node.comparators:
            _check_mask_calc_node(comparator)
    elif isinstance(node, ast.Name) and len(node.id) == 1 and "A" <= node.id <= "Z":
        return
    elif isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return
    else:
        raise _invalid_mask_calc_expr()


def validate_mask_calc_expr(expr: str) -> str:
    """Accept a GDAL calc expression made of bands, numbers, and operators."""
    if not isinstance(expr, str) or len(expr) > _MAX_MASK_CALC_EXPR_LEN:
        raise _invalid_mask_calc_expr()
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        raise _invalid_mask_calc_expr() from None
    _check_mask_calc_node(tree)
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
