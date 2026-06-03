"""Stable permission `code` values (must match `permissions.code` seeds / migrations).

Role bundles (conceptual):
- Admin: all codes below.
- Editor: prism.content.view, prism.dashboard.manage.
- Viewer: prism.content.view only.
- Public: no rows (unauthenticated / non-gated only).
"""

CONTENT_VIEW = "prism.content.view"
DASHBOARD_MANAGE = "prism.dashboard.manage"
ADMIN_ACCESS = "prism.admin.access"
DEPLOYMENT_MANAGE = "prism.deployment.manage"
USERS_MANAGE = "prism.users.manage"
MAP_EXPORTS_MANAGE = "prism.map_exports.manage"


def can_access_admin_panel(codes: set[str] | frozenset[str]) -> bool:
    """Enter Starlette-admin: full admins or dashboard managers."""
    return ADMIN_ACCESS in codes or DASHBOARD_MANAGE in codes


def can_manage_dashboards_in_admin(codes: set[str] | frozenset[str]) -> bool:
    """Dashboard model view in admin: same as panel entry for scoped managers."""
    return can_access_admin_panel(codes)


# Full set for auth-disabled dev mode (all gates pass that the admin UI expects).
ALL_CAPABILITIES = frozenset(
    {
        CONTENT_VIEW,
        DASHBOARD_MANAGE,
        ADMIN_ACCESS,
        DEPLOYMENT_MANAGE,
        USERS_MANAGE,
        MAP_EXPORTS_MANAGE,
    }
)
