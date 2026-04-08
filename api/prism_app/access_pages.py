"""Small HTML responses for PRISM authorization outcomes."""

from __future__ import annotations

from fastapi.responses import HTMLResponse


def access_denied_response(support_email: str = "") -> HTMLResponse:
    contact = (
        f'<p>Contact: <a href="mailto:{support_email}">{support_email}</a></p>'
        if support_email
        else ""
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Access denied</title></head>
<body>
<h1>Access not authorized</h1>
<p>You signed in successfully, but this application does not recognize your account,
or your access has been disabled.</p>
{contact}
<p><a href="/auth/sign-out">Sign out</a></p>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=403)


def access_not_configured_response(support_email: str = "") -> HTMLResponse:
    contact = (
        f'<p>Contact: <a href="mailto:{support_email}">{support_email}</a></p>'
        if support_email
        else "<p>Contact your administrator to be assigned permissions.</p>"
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Access pending</title></head>
<body>
<h1>Access not yet configured</h1>
<p>Your account is recognized, but no product permissions have been assigned yet.</p>
{contact}
<p><a href="/auth/sign-out">Sign out</a></p>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)


def oidc_not_configured_response() -> HTMLResponse:
    html = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Admin sign-in unavailable</title></head>
<body>
<h1>Admin sign-in is not configured</h1>
<p>Set PRISM OIDC environment variables (issuer, client id, client secret, redirect URI,
and session secret), or set <code>PRISM_ADMIN_AUTH_DISABLED=true</code> for local development only.</p>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=503)
