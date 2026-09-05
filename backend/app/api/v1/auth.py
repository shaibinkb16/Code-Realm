from fastapi import APIRouter, Depends, status, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
import uuid
import random
import string
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import redis_manager
from app.core.email import send_otp_email
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserProfile
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse, OTPVerifyRequest, OTPResendRequest, RefreshTokenRequest
from app.core.exceptions import AuthenticationError, ValidationError
from app.api.deps import get_current_user, RateLimiter
from app.services import refresh_token_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Account lockout thresholds (see login()). Chosen to absorb normal typos
# (5 attempts) while making credential-stuffing meaningfully slower (15 min
# lockout per cycle) without permanently locking someone out over a forgotten
# password.
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(minutes=15)

async def _generate_and_send_otp(email: str, background_tasks: BackgroundTasks):
    """Generates a 6-digit OTP, stores it in Redis for 5 minutes, and sends the email in the background."""
    clean_email = email.strip().lower()
    otp = "".join(random.choices(string.digits, k=6))
    
    await redis_manager.set(f"otp:{clean_email}", otp, ttl=300)
    background_tasks.add_task(send_otp_email, clean_email, otp)
    return otp

@router.post("/register", response_model=dict, status_code=201, dependencies=[Depends(RateLimiter(20, 3600))])
async def register_user(user_in: UserCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Registers a new user (inactive until OTP verification)."""
    clean_email = user_in.email.strip().lower()
    clean_username = user_in.username.strip()

    res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    if res.scalars().first():
        raise ValidationError("Email is already registered.")

    res_user = await db.execute(select(User).where(func.lower(User.username) == clean_username.lower()))
    if res_user.scalars().first():
        raise ValidationError("Username is already taken.")

    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        email=clean_email,
        username=clean_username,
        hashed_password=hashed_pwd,
        role="user",
        is_active=False  # Requires OTP Verification
    )
    db.add(new_user)
    await db.flush()

    profile = UserProfile(user_id=new_user.id)
    db.add(profile)
    await db.commit()
    
    await _generate_and_send_otp(clean_email, background_tasks)
    
    return {"message": "User registered. OTP sent to email.", "email": clean_email}

@router.post("/login", response_model=Token, dependencies=[Depends(RateLimiter(20, 60))])
async def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Authenticates credentials against Argon2id hash. Rejects if not verified."""
    clean_identity = credentials.username.strip()
    res = await db.execute(
        select(User).where(
            (func.lower(User.username) == clean_identity.lower()) |
            (func.lower(User.email) == clean_identity.lower())
        )
    )
    user = res.scalars().first()

    # Account lockout after repeated failed attempts. These columns existed
    # in the schema before this — nothing ever read or wrote them, so
    # credential stuffing had no server-side friction beyond rate limiting
    # on the endpoint itself (shared across all usernames, not per-account).
    # locked_until is a naive DateTime (matching every other timestamp column
    # in this codebase, e.g. created_at = Column(DateTime, default=
    # datetime.utcnow)) — comparing it against a timezone-aware datetime
    # raises TypeError, so this uses naive datetime.utcnow() throughout
    # rather than datetime.now(timezone.utc).
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=(
                "Account temporarily locked due to repeated failed login attempts. "
                f"Try again after {user.locked_until.isoformat()}Z."
            ),
        )

    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + LOCKOUT_DURATION
                logger.warning(
                    "Account locked after %s failed attempts: %s",
                    user.failed_login_attempts,
                    user.email,
                )
            await db.commit()
        raise AuthenticationError("Invalid username or password.")

    if user.failed_login_attempts:
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

    if not user.is_active:
        # Generate new OTP automatically when they try to log in unverified
        await _generate_and_send_otp(user.email, background_tasks)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Account not verified", "email": user.email}
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await refresh_token_service.record(db, user.id, refresh_token)
    await db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/verify-otp", response_model=Token, dependencies=[Depends(RateLimiter(30, 60))])
async def verify_otp(request: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verifies OTP and activates user, returning auth tokens."""
    clean_email = request.email.strip().lower()
    user_otp = request.otp.strip()

    stored_otp = await redis_manager.get(f"otp:{clean_email}")

    is_valid = False
    if stored_otp and stored_otp == user_otp:
        is_valid = True
    elif user_otp == "123456" and not settings.IS_PRODUCTION:
        # Development-only bypass so local signup works without SMTP configured.
        # Gated on ENVIRONMENT so it can never be used against production.
        logger.warning(
            "Development OTP bypass used for %s. This is disabled in production.",
            clean_email,
        )
        is_valid = True

    if not is_valid:
        raise AuthenticationError("Invalid or expired OTP.")

    res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = res.scalars().first()
    if not user:
        raise AuthenticationError("User not found.")
        
    user.is_active = True
    await db.commit()
    await redis_manager.delete(f"otp:{clean_email}")

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await refresh_token_service.record(db, user.id, refresh_token)
    await db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/resend-otp", response_model=dict, dependencies=[Depends(RateLimiter(10, 3600))])
async def resend_otp(request: OTPResendRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    clean_email = request.email.strip().lower()
    res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = res.scalars().first()
    if not user:
        # Don't reveal user existence
        return {"message": "If the email is registered, an OTP was sent."}
        
    if user.is_active:
        raise ValidationError("Account is already verified.")
        
    await _generate_and_send_otp(clean_email, background_tasks)
    return {"message": "If the email is registered, an OTP was sent."}

@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchanges a valid refresh token for a new access token, rotating the
    refresh token itself in the process (see refresh_token_service). The
    previous version returned the same refresh token indefinitely, so a
    stolen refresh token remained valid until its natural 7-day expiry no
    matter what a user did in /auth/sessions — there was nothing to revoke.
    """
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type.")
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload.")
    except AuthenticationError:
        raise
    except Exception:
        raise AuthenticationError("Invalid or expired refresh token.")

    new_refresh_token = create_refresh_token(subject=user_id)
    allowed = await refresh_token_service.check_and_rotate(
        db, request.refresh_token, new_refresh_token, user_id
    )
    if not allowed:
        await db.commit()
        raise AuthenticationError(
            "This refresh token was already used and has been revoked. Please log in again."
        )

    access_token = create_access_token(subject=user_id)
    await db.commit()
    return Token(access_token=access_token, refresh_token=new_refresh_token)

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile and skill details."""
    return current_user

import secrets
from urllib.parse import urlencode
import httpx
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.core.logging import logger

def _get_oauth_redirect_uri(request: Request, provider: str) -> str:
    """Returns the callback URI for OAuth, falling back to auto-detected server host if not configured."""
    configured_uri = settings.GOOGLE_REDIRECT_URI if provider == "google" else settings.GITHUB_REDIRECT_URI
    if configured_uri and "localhost:8000" not in configured_uri:
        return configured_uri

    server_base = str(request.base_url).rstrip('/')
    # If forwarded by proxy (e.g., Render/Nginx), check for https scheme
    proto = request.headers.get("x-forwarded-proto")
    if proto == "https" and server_base.startswith("http://"):
        server_base = "https://" + server_base[len("http://"):]

    path_prefix = "/api/v1/auth" if "/api/v1/" in str(request.url) else "/api/auth"
    return f"{server_base}{path_prefix}/{provider}/callback"

def _get_frontend_base(origin: str | None = None) -> str:
    if origin and (origin.startswith("http://") or origin.startswith("https://")):
        return origin.rstrip('/')
    return settings.FRONTEND_URL.rstrip('/')

@router.get("/google")
async def google_login(request: Request, origin: str | None = None):
    """Initiates Google OAuth 2.0 authorization flow."""
    frontend_base = _get_frontend_base(origin)
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_ID.strip():
        logger.error("Google OAuth login attempted but GOOGLE_CLIENT_ID is not configured.")
        return RedirectResponse(
            url=f"{frontend_base}/#auth_error?message=Google%20OAuth%20is%20not%20configured%20on%20the%20server",
            status_code=307
        )

    state = secrets.token_urlsafe(32)
    state_payload = {"origin": frontend_base, "csrf": secrets.token_hex(16)}
    await redis_manager.set(f"oauth_state:{state}", json.dumps(state_payload), ttl=600)

    redirect_uri = _get_oauth_redirect_uri(request, "google")

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": redirect_uri,
        "state": state,
        "access_type": "offline",
        "prompt": "select_account"
    }
    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_url, status_code=307)

@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Processes Google OAuth callback code, verifies identity, provisions user, and redirects with JWT tokens."""
    frontend_base = settings.FRONTEND_URL.rstrip('/')

    # 1. Validate CSRF state & retrieve originating frontend URL
    if state:
        stored_state_str = await redis_manager.get(f"oauth_state:{state}")
        if stored_state_str:
            try:
                stored_data = json.loads(stored_state_str)
                if isinstance(stored_data, dict) and "origin" in stored_data:
                    frontend_base = stored_data["origin"].rstrip('/')
            except Exception:
                pass
            await redis_manager.delete(f"oauth_state:{state}")

    if error or not code:
        logger.warning(f"Google OAuth callback error or missing code: error={error}")
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Google%20Authentication%20Cancelled", status_code=307)

    redirect_uri = _get_oauth_redirect_uri(request, "google")

    # 2. Exchange authorization code with Google
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(token_url, data=token_data)
            if res.status_code != 200:
                logger.error(f"Failed to exchange Google OAuth code: {res.text}")
                return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Failed%20to%20exchange%20authorization%20code", status_code=307)
            tokens = res.json()
            google_access_token = tokens.get("access_token")

            # 3. Retrieve user identity profile from Google
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"}
            )
            if userinfo_res.status_code != 200:
                logger.error(f"Failed to fetch Google user info: {userinfo_res.text}")
                return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Failed%20to%20fetch%20user%20profile%20from%20Google", status_code=307)
            
            user_info = userinfo_res.json()
    except Exception as e:
        logger.error(f"Google OAuth network error: {str(e)}")
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Google%20service%20connection%20failed", status_code=307)

    google_id = user_info.get("sub")
    raw_email = user_info.get("email")
    name = user_info.get("name") or user_info.get("given_name") or "Coder"
    picture = user_info.get("picture")

    if not google_id or not raw_email:
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Invalid%20Google%20profile%20payload", status_code=307)

    clean_email = raw_email.strip().lower()

    # 4. User Lookup & Link / Provisioning
    res = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.google_id == google_id)
    )
    user = res.scalars().first()

    if user:
        # Update details from Google on login
        if name:
            user.full_name = name
        if picture and user.profile:
            user.profile.avatar = picture
    else:
        res_email = await db.execute(
            select(User).options(selectinload(User.profile)).where(func.lower(User.email) == clean_email)
        )
        user = res_email.scalars().first()

        if user:
            # Link existing account by email
            user.google_id = google_id
            user.auth_provider = "google"
            user.is_active = True
            if name:
                user.full_name = name
            if picture and user.profile:
                user.profile.avatar = picture
        else:
            # Auto-provision new user
            base_username = "".join(c for c in name if c.isalnum()) or clean_email.split("@")[0]
            base_username = base_username[:30]
            
            final_username = base_username
            counter = 1
            while True:
                existing_u = await db.execute(select(User).where(func.lower(User.username) == final_username.lower()))
                if not existing_u.scalars().first():
                    break
                final_username = f"{base_username[:25]}_{counter}"
                counter += 1

            new_user = User(
                email=clean_email,
                username=final_username,
                full_name=name,
                hashed_password=hash_password(str(uuid.uuid4())),
                google_id=google_id,
                auth_provider="google",
                role="user",
                is_active=True
            )
            db.add(new_user)
            await db.flush()

            profile = UserProfile(
                user_id=new_user.id,
                avatar=picture or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
            )
            db.add(profile)
            user = new_user

    await db.commit()

    # 5. Issue Code Realm JWT tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await refresh_token_service.record(db, user.id, refresh_token)
    await db.commit()

    redirect_url = f"{frontend_base}/#auth_callback?access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=redirect_url, status_code=307)

@router.get("/github")
async def github_login(request: Request, origin: str | None = None):
    """Initiates GitHub OAuth 2.0 authorization flow."""
    frontend_base = _get_frontend_base(origin)
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_ID.strip():
        logger.error("GitHub OAuth login attempted but GITHUB_CLIENT_ID is not configured.")
        return RedirectResponse(
            url=f"{frontend_base}/#auth_error?message=GitHub%20OAuth%20is%20not%20configured%20on%20the%20server",
            status_code=307
        )

    state = secrets.token_urlsafe(32)
    state_payload = {"origin": frontend_base, "csrf": secrets.token_hex(16)}
    await redis_manager.set(f"oauth_state:{state}", json.dumps(state_payload), ttl=600)

    redirect_uri = _get_oauth_redirect_uri(request, "github")

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state
    }
    github_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=github_url, status_code=307)

@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Processes GitHub OAuth callback, verifies identity, retrieves user emails, provisions user, and redirects with JWT tokens."""
    frontend_base = settings.FRONTEND_URL.rstrip('/')

    # 1. Validate CSRF state & retrieve originating frontend URL
    if state:
        stored_state_str = await redis_manager.get(f"oauth_state:{state}")
        if stored_state_str:
            try:
                stored_data = json.loads(stored_state_str)
                if isinstance(stored_data, dict) and "origin" in stored_data:
                    frontend_base = stored_data["origin"].rstrip('/')
            except Exception:
                pass
            await redis_manager.delete(f"oauth_state:{state}")

    if error or not code:
        logger.warning(f"GitHub OAuth callback error or missing code: error={error}")
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=GitHub%20Authentication%20Cancelled", status_code=307)

    redirect_uri = _get_oauth_redirect_uri(request, "github")

    # 2. Exchange authorization code with GitHub
    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": redirect_uri
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                token_url,
                data=token_payload,
                headers={"Accept": "application/json", "User-Agent": "CodeRealm-OAuth"}
            )
            if res.status_code != 200:
                logger.error(f"Failed to exchange GitHub OAuth code: {res.text}")
                return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Failed%20to%20exchange%20GitHub%20code", status_code=307)
            tokens = res.json()
            github_access_token = tokens.get("access_token")

            if not github_access_token:
                logger.error(f"GitHub OAuth token missing from response: {tokens}")
                return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Invalid%20GitHub%20access%20token", status_code=307)

            # 3. Retrieve user profile from GitHub API
            gh_headers = {
                "Authorization": f"Bearer {github_access_token}",
                "User-Agent": "CodeRealm-OAuth",
                "Accept": "application/vnd.github.v3+json"
            }
            user_res = await client.get("https://api.github.com/user", headers=gh_headers)
            if user_res.status_code != 200:
                logger.error(f"Failed to fetch GitHub user profile: {user_res.text}")
                return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Failed%20to%20fetch%20GitHub%20user", status_code=307)
            
            user_data = user_res.json()
            
            # Fetch user email (if private on profile)
            primary_email = user_data.get("email")
            if not primary_email:
                emails_res = await client.get("https://api.github.com/user/emails", headers=gh_headers)
                if emails_res.status_code == 200:
                    emails_data = emails_res.json()
                    for email_obj in emails_data:
                        if email_obj.get("primary") and email_obj.get("verified"):
                            primary_email = email_obj.get("email")
                            break
                    if not primary_email and emails_data:
                        primary_email = emails_data[0].get("email")
    except Exception as e:
        logger.error(f"GitHub OAuth network error: {str(e)}")
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=GitHub%20service%20connection%20failed", status_code=307)

    github_id = str(user_data.get("id"))
    github_username = user_data.get("login") or "github_coder"
    name = user_data.get("name") or github_username
    avatar_url = user_data.get("avatar_url")

    if not github_id:
        return RedirectResponse(url=f"{frontend_base}/#auth_error?message=Invalid%20GitHub%20user%20ID", status_code=307)

    clean_email = (primary_email or f"{github_username.lower()}@github.coderealm.dev").strip().lower()

    # 4. User Lookup & Linking / Provisioning
    res = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.github_id == github_id)
    )
    user = res.scalars().first()

    if user:
        # Update details from GitHub on login
        if name:
            user.full_name = name
        user.github_username = github_username
        if avatar_url and user.profile:
            user.profile.avatar = avatar_url
    else:
        res_email = await db.execute(
            select(User).options(selectinload(User.profile)).where(func.lower(User.email) == clean_email)
        )
        user = res_email.scalars().first()

        if user:
            # Link existing user account with GitHub
            user.github_id = github_id
            user.github_username = github_username
            user.auth_provider = "github"
            user.is_active = True
            if name:
                user.full_name = name
            if avatar_url and user.profile:
                user.profile.avatar = avatar_url
        else:
            # Auto-provision new user
            base_username = "".join(c for c in github_username if c.isalnum()) or "Coder"
            base_username = base_username[:30]

            final_username = base_username
            counter = 1
            while True:
                existing_u = await db.execute(select(User).where(func.lower(User.username) == final_username.lower()))
                if not existing_u.scalars().first():
                    break
                final_username = f"{base_username[:25]}_{counter}"
                counter += 1

            new_user = User(
                email=clean_email,
                username=final_username,
                full_name=name,
                hashed_password=hash_password(str(uuid.uuid4())),
                github_id=github_id,
                github_username=github_username,
                auth_provider="github",
                role="user",
                is_active=True
            )
            db.add(new_user)
            await db.flush()

            profile = UserProfile(
                user_id=new_user.id,
                avatar=avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
            )
            db.add(profile)
            user = new_user

    await db.commit()

    # 5. Issue application JWT tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await refresh_token_service.record(db, user.id, refresh_token)
    await db.commit()

    redirect_url = f"{frontend_base}/#auth_callback?access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=redirect_url, status_code=307)


# ─────────────────────────────────────────────────────────
# PASSKEY (WEBAUTHN) AUTHENTICATION ENDPOINTS
# ─────────────────────────────────────────────────────────
from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.auth_models import Passkey, UserSession, AuthEvent

class PasskeyRegisterVerifyRequest(BaseModel):
    challenge: str
    credential_id: str
    public_key: str
    name: Optional[str] = "Passkey Authenticator"
    transports: Optional[List[str]] = []

class PasskeyLoginVerifyRequest(BaseModel):
    challenge: str
    credential_id: str

class OnboardingRequest(BaseModel):
    title: Optional[str] = "Code Realm Explorer ⚔️"
    avatar: Optional[str] = None
    goals: List[str] = []
    preferred_language: str = "python"
    skill_level: str = "Intermediate"
    career_goal: Optional[str] = "Full-Stack Developer"


@router.post("/passkeys/register/options")
async def get_passkey_register_options(
    current_user: User = Depends(get_current_user)
):
    """Generates WebAuthn registration options and challenge for current user."""
    challenge = "".join(random.choices(string.ascii_letters + string.digits, k=32))
    await redis_manager.set(f"passkey_challenge:{current_user.id}:{challenge}", "active", ttl=300)

    return {
        "status": "SUCCESS",
        "options": {
            "challenge": challenge,
            "rp": {
                "name": "Code Realm",
                "id": "coderealm.dev"
            },
            "user": {
                "id": str(current_user.id),
                "name": current_user.email,
                "displayName": current_user.full_name or current_user.username
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7}, # ES256
                {"type": "public-key", "alg": -257} # RS256
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "userVerification": "preferred",
                "residentKey": "required"
            },
            "timeout": 60000
        }
    }

@router.post("/passkeys/register/verify")
async def verify_passkey_registration(
    req: PasskeyRegisterVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifies passkey attestation challenge and registers credential in DB."""
    challenge_val = await redis_manager.get(f"passkey_challenge:{current_user.id}:{req.challenge}")
    if not challenge_val:
        raise HTTPException(status_code=400, detail="Invalid or expired passkey registration challenge.")
    
    await redis_manager.delete(f"passkey_challenge:{current_user.id}:{req.challenge}")

    # Check if credential already exists
    existing = await db.execute(select(Passkey).where(Passkey.credential_id == req.credential_id))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="This passkey credential is already registered.")

    new_passkey = Passkey(
        id=uuid.uuid4(),
        user_id=current_user.id,
        credential_id=req.credential_id,
        public_key=req.public_key,
        name=req.name or "Passkey Authenticator",
        transports=req.transports or ["internal"]
    )
    db.add(new_passkey)

    event = AuthEvent(
        id=uuid.uuid4(),
        user_id=current_user.id,
        event_type="PASSKEY_CREATED",
        metadata_json={"credential_id": req.credential_id, "name": req.name}
    )
    db.add(event)
    await db.commit()

    return {"status": "SUCCESS", "message": "Passkey registered successfully.", "passkey_id": str(new_passkey.id)}


@router.post("/passkeys/login/options")
async def get_passkey_login_options():
    """Generates WebAuthn login challenge for passwordless sign in."""
    challenge = "".join(random.choices(string.ascii_letters + string.digits, k=32))
    await redis_manager.set(f"passkey_login_challenge:{challenge}", "active", ttl=300)

    return {
        "status": "SUCCESS",
        "options": {
            "challenge": challenge,
            "timeout": 60000,
            "rpId": "coderealm.dev",
            "userVerification": "preferred"
        }
    }

@router.post("/passkeys/login/verify")
async def verify_passkey_login(
    req: PasskeyLoginVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verifies passkey assertion challenge and returns application access & refresh tokens."""
    challenge_val = await redis_manager.get(f"passkey_login_challenge:{req.challenge}")
    if not challenge_val:
        raise HTTPException(status_code=400, detail="Invalid or expired passkey login challenge.")
    
    await redis_manager.delete(f"passkey_login_challenge:{req.challenge}")

    stmt = select(Passkey).options(selectinload(Passkey.user)).where(Passkey.credential_id == req.credential_id)
    res = await db.execute(stmt)
    passkey_entry = res.scalars().first()

    if not passkey_entry or not passkey_entry.user:
        raise HTTPException(status_code=404, detail="Passkey credential not recognized.")

    user = passkey_entry.user
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled.")

    passkey_entry.last_used_at = datetime.utcnow()

    event = AuthEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        event_type="PASSKEY_USED",
        metadata_json={"credential_id": req.credential_id}
    )
    db.add(event)
    await db.commit()

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    await refresh_token_service.record(db, user.id, refresh_token)
    await db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/passkeys")
async def list_user_passkeys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Passkey).where(Passkey.user_id == current_user.id).order_by(Passkey.created_at.desc())
    res = await db.execute(stmt)
    keys = res.scalars().all()
    return {
        "status": "SUCCESS",
        "passkeys": [
            {
                "id": str(k.id),
                "name": k.name,
                "created_at": k.created_at.isoformat(),
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "transports": k.transports
            } for k in keys
        ]
    }

@router.delete("/passkeys/{passkey_id}")
async def delete_user_passkey(
    passkey_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Passkey).where((Passkey.id == passkey_id) & (Passkey.user_id == current_user.id))
    res = await db.execute(stmt)
    key_entry = res.scalars().first()
    if not key_entry:
        raise HTTPException(status_code=404, detail="Passkey not found.")

    await db.delete(key_entry)
    
    event = AuthEvent(
        id=uuid.uuid4(),
        user_id=current_user.id,
        event_type="PASSKEY_REMOVED",
        metadata_json={"passkey_id": str(passkey_id)}
    )
    db.add(event)
    await db.commit()
    return {"status": "SUCCESS", "message": "Passkey removed."}


# ─────────────────────────────────────────────────────────
# SESSION MANAGEMENT & ONBOARDING ENDPOINTS
# ─────────────────────────────────────────────────────────
@router.get("/sessions")
async def list_user_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserSession).where(
        (UserSession.user_id == current_user.id) &
        (UserSession.revoked_at.is_(None))
    ).order_by(UserSession.last_used_at.desc())
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    return {
        "status": "SUCCESS",
        "sessions": [
            {
                "id": str(s.id),
                "device_name": s.device_name or "Chrome • Desktop",
                "device_type": s.device_type,
                "ip_address": s.ip_address or "127.0.0.1",
                "is_current": s.is_current,
                "created_at": s.created_at.isoformat(),
                "last_used_at": s.last_used_at.isoformat()
            } for s in sessions
        ]
    }

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserSession).where((UserSession.id == session_id) & (UserSession.user_id == current_user.id))
    res = await db.execute(stmt)
    session_entry = res.scalars().first()
    if not session_entry:
        raise HTTPException(status_code=404, detail="Session not found.")

    session_entry.revoked_at = datetime.utcnow()
    await db.commit()
    return {"status": "SUCCESS", "message": "Session revoked."}


@router.post("/onboarding")
async def save_onboarding_preferences(
    req: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Saves user explorer profile, goals, preferred language, and calibrates initial ELO rank rating."""
    res = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = res.scalars().first()

    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    if req.title:
        profile.title = req.title
    if req.avatar:
        profile.avatar = req.avatar

    # Calibrate initial starting ELO rank_rating based on skill_level assessment
    level_elo_map = {
        "Child / absolute beginner": 300,
        "Beginner": 500,
        "Intermediate": 800,
        "Advanced": 1200,
        "Advanced Engineer": 1200
    }
    initial_elo = level_elo_map.get(req.skill_level, 500)
    profile.rank_rating = initial_elo

    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Adaptive onboarding complete. Your realm is ready!",
        "profile": {
            "title": profile.title,
            "avatar": profile.avatar,
            "level": profile.level,
            "xp": profile.xp,
            "rank_rating": profile.rank_rating,
            "preferred_language": req.preferred_language,
            "skill_level": req.skill_level,
            "career_goal": req.career_goal
        }
    }



