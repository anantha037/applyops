"""Quick diagnostic: print R2 env vars to spot misconfiguration."""
import os
from dotenv import load_dotenv
load_dotenv()

print(f"R2_ACCOUNT_ID       = {os.environ.get('R2_ACCOUNT_ID', 'NOT SET')!r}")
print(f"R2_ACCESS_KEY_ID    = {os.environ.get('R2_ACCESS_KEY_ID', 'NOT SET')!r}")
print(f"R2_SECRET_ACCESS_KEY = {os.environ.get('R2_SECRET_ACCESS_KEY', 'NOT SET')[:10]!r}...")
print(f"R2_BUCKET_NAME      = {os.environ.get('R2_BUCKET_NAME', 'NOT SET')!r}")

acct = os.environ.get('R2_ACCOUNT_ID', '')
key  = os.environ.get('R2_ACCESS_KEY_ID', '')
print()
print(f"ACCOUNT_ID length = {len(acct)}, starts with: {acct[:8]}")
print(f"ACCESS_KEY length = {len(key)},  starts with: {key[:8]}")
print()
print("Note: Cloudflare Account ID is a 32-char lowercase hex string.")
print("      R2 Access Key ID is also typically 32 hex chars.")
print("      R2 Secret is 64 hex chars.")
print("      cfut_... prefix indicates an API token, not an account/key ID.")
