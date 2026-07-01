"""Import every worker entrypoint to catch missing deps in the slim worker image.

Runs inside the Dockerfile.export-map-worker image in CI. Catches the class of bug
where requirements-export-map-worker.txt drifts from the worker import graph
(e.g. a transitive `pydantic_settings` import added to prism_app.auth.admin_settings).
"""

from __future__ import annotations

import importlib
import sys

WORKER_ENTRYPOINTS = (
    "prism_app.workers.export_map_worker",
    "prism_app.workers.alert_runner",
    "prism_app.workers.scheduled_public_maps.cron",
    "prism_app.workers.schedule_export_email_runner",
)


def main() -> None:
    failures: list[str] = []
    for module in WORKER_ENTRYPOINTS:
        try:
            importlib.import_module(module)
            print(f"OK  {module}")
        except Exception as exc:  # noqa: BLE001 - report all import-time failures
            failures.append(f"{module}: {type(exc).__name__}: {exc}")
            print(f"FAIL {module}: {type(exc).__name__}: {exc}", file=sys.stderr)

    if failures:
        print(
            f"\nWorker import smoke FAILED ({len(failures)} module(s)). "
            "Likely a missing dependency in requirements-export-map-worker.txt.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"\nWorker import smoke OK ({len(WORKER_ENTRYPOINTS)} entrypoints)")


if __name__ == "__main__":
    main()
