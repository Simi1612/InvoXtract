from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
security = HTTPBearer(auto_error=False)


def _verify_token(token: str) -> str | None:
    try:
        response = supabase.auth.get_user(token)
        if response and response.user:
            return response.user.id
        return None
    except Exception:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = _verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id


def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str | None:
    if not credentials:
        return None
    return _verify_token(credentials.credentials)


async def upload_file_to_storage(user_id: str, invoice_id: str, file_bytes: bytes, filename: str) -> str:
    path = f"{user_id}/{invoice_id}/{filename}"
    try:
        supabase.storage.from_("Invoices").upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": "application/octet-stream"},
        )
        print(f"[STORAGE] Upload OK: {path}")
    except Exception as e:
        print(f"[STORAGE] Upload FAILED: {e}")
    return path
