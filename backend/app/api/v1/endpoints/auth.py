import logging
import random
from typing import Optional
from fastapi import APIRouter, HTTPException
import httpx

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import db
from app.models.user import (
    create_user,
    get_user_by_id,
    get_user_by_identifier,
    save_otp,
    update_user,
    update_user_password,
    verify_otp,
    verify_password,
)
from app.schemas.user import (
    ForgotPasswordRequest,
    GoogleLogin,
    ResetPasswordRequest,
    SendOTPRequest,
    UserLogin,
    UserRegister,
    VerifyOTPRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()

NEON_AUTH_ORIGIN = "http://localhost:8081"
NEON_AUTH_HEADERS = {
    "Origin": NEON_AUTH_ORIGIN,
    "Content-Type": "application/json",
}


async def neon_auth_post(endpoint: str, payload: dict) -> httpx.Response:
    base_url = (settings.neon_auth_base_url or "").rstrip("/")
    url = f"{base_url}{endpoint}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await client.post(url, json=payload, headers=NEON_AUTH_HEADERS)


@router.post("/register")
async def register(user: UserRegister):
    email = (user.email or "").strip()
    phone = (user.phone or "").strip()

    # Pre-check if already exists locally
    existing = await get_user_by_identifier(email or None, phone or None)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or phone already exists")

    neon_user_id: Optional[str] = None
    neon_sent_verification = False

    # 1. Register with Neon Auth (Better Auth) if email is provided
    # This automatically adds the user to neon_auth.user and triggers email verification via auth@mail.myneon.app
    if email and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/sign-up/email",
                {
                    "name": user.name or email.split("@")[0],
                    "email": email,
                    "password": user.password,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                neon_user = data.get("user") or {}
                if neon_user.get("id"):
                    neon_user_id = str(neon_user["id"])
                neon_sent_verification = True
                logger.info(f"[AUTH] Neon Auth registered user: {email} (id: {neon_user_id}) and sent verification email.")
            else:
                data = resp.json() if resp.content else {}
                msg = data.get("message", "") or resp.text
                logger.error(f"[AUTH] Neon Auth sign-up failed ({resp.status_code}): {resp.text}")
                if "already" in msg.lower() or data.get("code") == "USER_ALREADY_EXISTS":
                    raise HTTPException(status_code=400, detail="User with this email already exists")
                raise HTTPException(status_code=502, detail=f"Could not create account: {msg}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[AUTH] Neon Auth sign-up error: {e}")
            raise HTTPException(status_code=502, detail="Could not reach the authentication service. Please try again.")

    # 2. Persist in public.users relational store
    user_id = await create_user(user, user_id=neon_user_id)
    token = create_access_token(data={"sub": user_id})

    # 3. If Neon Auth didn't send email (e.g. phone-only or offline dev), generate local OTP fallback
    identifier = email or phone
    if identifier and not neon_sent_verification:
        otp = f"{random.randint(100000, 999999)}"
        await save_otp(identifier, otp, purpose="verification")
        logger.info(f"[AUTH] Generated local fallback OTP for {identifier}: {otp}")

    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "requires_verification": True,
        "message": f"Verification code sent to {identifier}. Please check your inbox.",
    }


@router.post("/login")
async def login(user: UserLogin):
    email = (user.email or "").strip()
    phone = (user.phone or "").strip()

    # 1. Attempt Neon Auth login if email provided
    if email and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/sign-in/email",
                {"email": email, "password": user.password},
            )
            if resp.status_code == 200:
                data = resp.json()
                neon_user = data.get("user") or {}
                user_id = str(neon_user.get("id"))
                token = create_access_token(data={"sub": user_id})
                return {"access_token": token, "token_type": "bearer", "user_id": user_id}
            elif resp.status_code == 403:
                data = resp.json()
                if data.get("code") == "EMAIL_NOT_VERIFIED" or "verify" in data.get("message", "").lower():
                    raise HTTPException(
                        status_code=403,
                        detail="Email not verified. Please check your email for the verification code.",
                    )
            elif resp.status_code in (400, 401):
                raise HTTPException(status_code=400, detail="Incorrect email or password")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"[AUTH] Neon Auth login check failed, falling back: {e}")

    # 2. Fallback to public.users table check
    db_user = await get_user_by_identifier(email or None, phone or None)
    if not db_user or not verify_password(user.password, db_user.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect credentials")

    token = create_access_token(data={"sub": db_user["user_id"]})
    return {"access_token": token, "token_type": "bearer", "user_id": db_user["user_id"]}


@router.post("/send-otp")
async def send_otp(req: SendOTPRequest):
    identifier = (req.email or req.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    otp_type = "forget-password" if req.purpose == "reset_password" else "email-verification"
    neon_sent = False

    # Send OTP via Neon Auth's official email provider (auth@mail.myneon.app)
    if "@" in identifier and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/email-otp/send-verification-otp",
                {"email": identifier, "type": otp_type},
            )
            if resp.status_code == 200:
                neon_sent = True
                logger.info(f"[AUTH] Neon Auth sent {otp_type} OTP to {identifier}")
            else:
                logger.warning(f"[AUTH] Neon Auth send-otp responded {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"[AUTH] Neon Auth send-otp error: {e}")

    # Also record local fallback OTP
    otp = f"{random.randint(100000, 999999)}"
    await save_otp(identifier, otp, purpose=req.purpose or "verification")

    return {
        "status": "success",
        "message": f"Verification code sent to {identifier}",
        "identifier": identifier,
        "dev_otp": otp if settings.env == "development" else None,
    }


@router.post("/verify-otp")
async def verify_otp_endpoint(req: VerifyOTPRequest):
    identifier = (req.email or req.phone or "").strip()
    if not identifier or not req.otp:
        raise HTTPException(status_code=400, detail="Identifier and OTP code are required")

    code = req.otp.strip()
    verified = False

    # 1. Verify via Neon Auth if email
    if "@" in identifier and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/email-otp/verify-email",
                {"email": identifier, "otp": code},
            )
            if resp.status_code == 200:
                verified = True
                logger.info(f"[AUTH] Neon Auth verified email for {identifier}")
            else:
                logger.warning(f"[AUTH] Neon Auth verify failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.warning(f"[AUTH] Neon Auth verify error: {e}")

    # 2. Local fallback check
    if not verified:
        verified = await verify_otp(identifier, code, purpose=req.purpose or "verification")

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    # Mark user verified in DB
    db_user = await get_user_by_identifier(req.email, req.phone)
    token = None
    user_id = None
    if db_user:
        user_id = db_user.get("user_id")
        token = create_access_token(data={"sub": user_id})
        await update_user(user_id, {"onboarded": db_user.get("onboarded", False)})

    return {
        "verified": True,
        "message": "Code verified successfully",
        "access_token": token,
        "user_id": user_id,
    }


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    identifier = (req.email or req.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Neon Auth password reset OTP
    if "@" in identifier and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/email-otp/send-verification-otp",
                {"email": identifier, "type": "forget-password"},
            )
            if resp.status_code == 200:
                logger.info(f"[AUTH] Neon Auth sent password reset OTP to {identifier}")
        except Exception as e:
            logger.warning(f"[AUTH] Neon Auth forgot password error: {e}")

    otp = f"{random.randint(100000, 999999)}"
    await save_otp(identifier, otp, purpose="reset_password")

    return {
        "status": "success",
        "message": f"Password reset code sent to {identifier}",
        "identifier": identifier,
        "dev_otp": otp if settings.env == "development" else None,
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    identifier = (req.email or req.phone or "").strip()
    if not identifier or not req.otp or not req.new_password:
        raise HTTPException(status_code=400, detail="Identifier, OTP code, and new password are required")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    code = req.otp.strip()
    verified = False

    # 1. Neon Auth reset password
    if "@" in identifier and settings.neon_auth_base_url:
        try:
            resp = await neon_auth_post(
                "/email-otp/reset-password",
                {"email": identifier, "otp": code, "password": req.new_password},
            )
            if resp.status_code == 200:
                verified = True
                logger.info(f"[AUTH] Neon Auth reset password verified for {identifier}")
            else:
                logger.warning(f"[AUTH] Neon Auth reset password failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.warning(f"[AUTH] Neon Auth reset password error: {e}")

    # 2. Local fallback check
    if not verified:
        verified = await verify_otp(identifier, code, purpose="reset_password")

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    # Update local password hash
    await update_user_password(identifier, req.new_password)

    db_user = await get_user_by_identifier(req.email, req.phone)
    token = None
    user_id = None
    if db_user:
        user_id = db_user.get("user_id")
        token = create_access_token(data={"sub": user_id})

    return {
        "status": "success",
        "message": "Password updated successfully. You can now log in.",
        "access_token": token,
        "user_id": user_id,
    }


@router.post("/google")
async def google_auth(login: GoogleLogin):
    token = create_access_token(data={"sub": login.user_id})

    existing = await get_user_by_id(login.user_id)
    if not existing:
        await db.users.insert_one(
            {
                "user_id": login.user_id,
                "email": login.email,
                "name": login.name,
                "onboarded": False,
                "appLang": "English",
                "village": "",
                "district": "",
                "state": "",
                "crops": "",
                "interests": [],
            }
        )

    return {"access_token": token, "token_type": "bearer", "user_id": login.user_id}
