from typing import Optional
from app.core.config import settings
from app.core.logging import logger

_supabase_client = None

def get_supabase_client():
    """Returns initialized Supabase Client instance."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info(f"Supabase Client initialized for {settings.SUPABASE_URL}")
            return _supabase_client
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
    return None
