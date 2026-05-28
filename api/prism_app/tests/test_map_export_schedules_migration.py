"""Smoke checks for map_export_schedules Alembic revision."""

from pathlib import Path

_REVISION = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "map_export_schedules_001.py"
)


def test_migration_defines_schedule_table_and_permission_seed() -> None:
    source = _REVISION.read_text(encoding="utf-8")
    assert 'revision = "map_export_schedules_001"' in source
    assert 'down_revision = "map_export_job_priority_001"' in source
    assert 'op.create_table(\n        "map_export_schedules"' in source
    assert "postgresql.JSONB" in source
    assert "ix_map_export_schedules_status_country_layer" in source
    assert "map_export_schedule_id" in source
    assert "created_by_user_id" in source
    assert "prism.map_exports.manage" in source
    assert "ck_map_export_schedules_status" in source
    assert "'active', 'stopped'" in source
