"""Error handling module."""
import traceback

from flask import Response, current_app, jsonify, redirect

import sqlalchemy.exc

from werkzeug.exceptions import HTTPException
from werkzeug.routing import RequestRedirect


def logError(description, traceback=None):
    """Log error description and traceback, if provided, to stderr."""
    current_app.logger.error(description)
    if traceback:
        current_app.logger.error(traceback)


def make_json_error(ex: Exception):
    """Catch all HTTP error codes and turn them into JSON responses.

    This assumes that this Flask app is JSON-only.

    Reference: https://flask.palletsprojects.com/en/1.1.x/errorhandling/
    """
    status = ex.code if isinstance(ex, HTTPException) else 500
    response: Response = jsonify(error=str(ex), status=status)
    response.status_code = status
    logError('HTTP Error %s: %s' % (status, str(ex)))
    return response


def handle_error(e: Exception):
    """Catch all exceptions and turn them into a JSON response."""
    # Perform redirects requested by werkzeug's routing.
    if isinstance(e, RequestRedirect):
        return redirect(e.new_url, e.code)

    status = 500
    tb = traceback.format_exc()
    error_traceback = tb.splitlines()

    if isinstance(e, sqlalchemy.exc.DatabaseError):
        kind = 'Database error'
    else:
        kind = 'Internal server error'

    short_message = e.args[0]
    if isinstance(short_message, str):
        short_message = short_message.partition('\n')[0]

    error_message = '%s: %s' % (kind, short_message)

    if current_app.debug:
        response: Response = jsonify(
            error=error_message,
            status=status,
            details={'traceback': error_traceback}
        )
    else:
        response: Response = jsonify(
            error=kind,
            status=status
        )

    response.status_code = status
    logError(error_message, traceback=tb)
    return response
