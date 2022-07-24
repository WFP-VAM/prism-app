"""Timer functions."""
import logging
from functools import wraps
from time import time

logger = logging.getLogger(__name__)


def timed(f):
    """Timer wrapper."""

    @wraps(f)
    def wrapper(*args, **kwds):
        start = time() * 1000
        result = f(*args, **kwds)
        elapsed = time() * 1000 - start

        timer_message = "%s took %d ms to complete." % (f.__name__, elapsed)
        logger.info(timer_message)
        return result

    return wrapper
