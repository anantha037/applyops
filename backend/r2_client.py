"""Cloudflare R2 client for ApplyOps.

Cloudflare R2 is S3-compatible, so boto3 is used with a custom endpoint URL.
This module provides only the configuration/client layer needed for later phases
(Phase B: resume upload/list/presigned-URL logic).

The bucket must remain **private** — never enable public access.
Presigned URLs are generated on demand and are short-lived (default: 1 hour).

Required env vars:
    R2_ACCOUNT_ID         – from the Cloudflare dashboard
    R2_ACCESS_KEY_ID      – R2 API token access key
    R2_SECRET_ACCESS_KEY  – R2 API token secret
    R2_BUCKET_NAME        – name of the R2 bucket (e.g. "applyops-resumes")
"""

from __future__ import annotations

import os

import boto3
from botocore.client import BaseClient
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

R2_ACCOUNT_ID       = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID    = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME      = os.environ["R2_BUCKET_NAME"].strip("'\"")   # strip accidental quotes

# R2's S3-compatible endpoint — constructed from the account ID.
# Format: https://<account_id>.r2.cloudflarestorage.com
R2_ENDPOINT_URL = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Presigned URLs expire after this many seconds (1 hour by default).
PRESIGNED_URL_TTL_SECONDS = 3600


def get_r2_client() -> BaseClient:
    """Return a boto3 S3 client configured for Cloudflare R2.

    The client is stateless — safe to call once per request in later phases,
    or to cache at module level if preferred.
    """
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",   # R2 uses "auto" as the region
    )


# ---------------------------------------------------------------------------
# Helpers (stubs — will be fully implemented in Phase B)
# ---------------------------------------------------------------------------

def generate_presigned_url(storage_key: str, ttl_seconds: int = PRESIGNED_URL_TTL_SECONDS) -> str:
    """Generate a short-lived presigned download URL for a private R2 object.

    NOT yet called by any route — implemented fully in Phase B.
    """
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": storage_key},
        ExpiresIn=ttl_seconds,
    )
