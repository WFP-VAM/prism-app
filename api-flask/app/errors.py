"""Error handling module."""
import traceback

import sqlalchemy.exc

# from flask import Response, current_app, jsonify, redirect
# from werkzeug.exceptions import HTTPException
# from werkzeug.routing import RequestRedirect
from fastapi import HTTPException, Response, status
from fastapi.encoders import jsonable_encoder


def logError(description, traceback=None):
    """Log error description and traceback, if provided, to stderr."""
    current_app.logger.error(description)
    if traceback:
        current_app.logger.error(traceback)


# TODO: this is not used with fastapi
def make_json_error(ex: Exception):
    """Catch all HTTP error codes and turn them into JSON responses.

    This assumes that this Flask app is JSON-only.

    Reference: https://flask.palletsprojects.com/en/1.1.x/errorhandling/
    """
    status = ex.code if isinstance(ex, HTTPException) else 500  # type: ignore
    response: Response = jsonify(error=str(ex), status=status)  # type: ignore
    response.status_code = status
    logError("HTTP Error %s: %s" % (status, str(ex)))
    return response


# TODO: this is not used with fastapi
def handle_error(e: Exception) -> Response:
    """Catch all exceptions and turn them into a JSON response."""
    # Perform redirects requested by werkzeug's routing.
    # if isinstance(e, RequestRedirect):
    #     return redirect(e.new_url, e.code)

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    tb = traceback.format_exc()
    error_traceback = tb.splitlines()

    if isinstance(e, sqlalchemy.exc.DatabaseError):
        kind = "Database error"
    else:
        kind = "Internal server error"

    short_message = e.args[0]
    if isinstance(short_message, str):
        short_message = short_message.partition("\n")[0]

    error_message = "%s: %s" % (kind, short_message)

    if current_app.debug:  # type: ignore
        response: Response = jsonable_encoder(
            dict(
                error=error_message,
                status=status,
                details={"traceback": error_traceback},
            )
        )
    else:
        response: Response = jsonable_encoder(dict(error=kind, status=status))  # type: ignore

    response.status_code = status_code
    logError(error_message, traceback=tb)
    return response
