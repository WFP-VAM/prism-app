"""Queue priority for ``map_export_jobs`` (higher = claimed first)."""

# Interactive / API-originated exports should preempt scheduled public map churn.
MAP_EXPORT_JOB_PRIORITY_SCHEDULED_PUBLIC = 100
MAP_EXPORT_JOB_PRIORITY_INTERACTIVE = 200
