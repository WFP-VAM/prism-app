"""Consume EXPORT_JOB_QUEUE_URL and run Playwright exports (implementation TBD).

Run: ``python -m prism_app.worker.export_map_worker``
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-8s %(message)s",
        level=logging.INFO,
    )
    logger.warning(
        "export_map_worker: SQS receive + export_maps + S3 upload not wired yet"
    )


if __name__ == "__main__":
    main()
