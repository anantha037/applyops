"""R2 connection verification — Phase A.

The R2 env vars in .env appear to be misconfigured — the Cloudflare Account ID
is missing (R2_ACCOUNT_ID contains an API token value, not the account ID).

This script will attempt the connection with whatever account ID is provided
and clearly state what needs to be corrected.

Usage:
    python backend/scripts/verify_r2.py
Or override the account ID directly:
    python backend/scripts/verify_r2.py <account_id>
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import boto3
from dotenv import load_dotenv

load_dotenv()

R2_ACCOUNT_ID        = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID     = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME       = os.environ.get("R2_BUCKET_NAME", "").strip("'\"")

TEST_KEY     = "_applyops_phase_a_verify_test.txt"
TEST_CONTENT = b"ApplyOps Phase A - R2 verification object. Safe to delete."


def try_endpoint(account_id: str) -> bool:
    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    print(f"Endpoint: {endpoint}")
    print(f"Bucket:   {R2_BUCKET_NAME}")
    print(f"Key ID:   {R2_ACCESS_KEY_ID[:8]}...(truncated)")

    try:
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
        # [1] put
        print("\n[1/3] Writing test object...")
        client.put_object(Bucket=R2_BUCKET_NAME, Key=TEST_KEY, Body=TEST_CONTENT)
        print("      OK - put_object succeeded")
        # [2] get
        print("[2/3] Reading back...")
        resp = client.get_object(Bucket=R2_BUCKET_NAME, Key=TEST_KEY)
        body = resp["Body"].read()
        assert body == TEST_CONTENT, f"Content mismatch: {body!r}"
        print(f"      OK - get_object succeeded ({len(body)} bytes, content verified)")
        # [3] delete
        print("[3/3] Deleting...")
        client.delete_object(Bucket=R2_BUCKET_NAME, Key=TEST_KEY)
        print("      OK - delete_object succeeded")
        print("\n--- PASS: R2 verification passed ---")
        print(f"    Correct account ID: {account_id}")
        print("    Update R2_ACCOUNT_ID in .env if it was wrong.")
        return True
    except Exception as exc:
        print(f"\n--- FAIL: {type(exc).__name__}: {exc} ---")
        return False


def main() -> None:
    # If passed as CLI arg, use that; otherwise use the env var.
    account_id = sys.argv[1] if len(sys.argv) > 1 else R2_ACCOUNT_ID

    print("=" * 60)
    print("ApplyOps Phase A -- R2 verification")
    print("=" * 60)
    print()

    if not account_id or account_id.startswith("cfut_"):
        print("ERROR: R2_ACCOUNT_ID in .env is not a valid Cloudflare Account ID.")
        print()
        print("How to find the correct values:")
        print("  1. Go to: https://dash.cloudflare.com")
        print("     Right sidebar shows 'Account ID' (32-char hex string).")
        print("     This goes into R2_ACCOUNT_ID.")
        print()
        print("  2. In Cloudflare dashboard: R2 -> Manage R2 API Tokens")
        print("     -> Your token -> 'Access Key ID' (32-char hex)")
        print("     This goes into R2_ACCESS_KEY_ID.")
        print()
        print("  3. The 'Secret Access Key' (64-char hex) from the same token")
        print("     goes into R2_SECRET_ACCESS_KEY.")
        print()
        print(f"  Current R2_ACCOUNT_ID value: {account_id!r}")
        print(f"  (starts with 'cfut_' -- this is a Cloudflare API token, not an account ID)")
        print()

        if len(sys.argv) <= 1:
            print("You can test with the correct account ID directly:")
            print("  python backend/scripts/verify_r2.py <your-32-char-account-id>")
            sys.exit(1)

    try_endpoint(account_id)


if __name__ == "__main__":
    main()
