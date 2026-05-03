from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import User, Host, UserRole
from ..auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(request: Request, db: Session = Depends(get_db)):
    """Register a new user (guest by default; host if role=host with full_name+address)."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid json")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="invalid payload")

    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="password must be at least 8 characters")

    role_str = (data.get("role") or "guest").lower()
    if role_str not in ("guest", "host", "admin"):
        role_str = "guest"

    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="email already registered")

    try:
        user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole(role_str),
            phone=data.get("phone"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="email already registered")

    if role_str == "host":
        full_name = data.get("full_name") or ""
        address = data.get("address") or ""
        if not full_name or not address:
            full_name = full_name or "Host"
            address = address or "TBD"
        host = Host(user_id=user.id, full_name=full_name, address=address)
        db.add(host)

    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.email, user.role.value)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "role": user.role.value, "phone": user.phone},
    }


@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    """Login and return a JWT token."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid json")
    email = (data.get("email") or "").lower()
    password = data.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    token = create_token(user.id, user.email, user.role.value)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "role": user.role.value, "phone": user.phone},
    }
