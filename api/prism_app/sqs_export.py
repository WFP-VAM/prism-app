"""Send export job ids to SQS."""

from __future__ import annotations

import json
import logging
import os

import boto3

logger = logging.getLogger(__name__)


def send_export_job_message(job_id: str) -> None:
    queue_url = os.getenv("EXPORT_JOB_QUEUE_URL")
    if not queue_url:
        raise RuntimeError(
            "EXPORT_JOB_QUEUE_URL must be set to enqueue map export jobs"
        )
    client = boto3.client("sqs")
    client.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps({"job_id": job_id}),
    )
    logger.debug("Sent export job %s to SQS", job_id)
