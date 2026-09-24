from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# ── CREATE TOKEN ──────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    """Create a JWT token with an expiry time"""
    to_encode = data.copy()
    expire    = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ── DECODE TOKEN ──────────────────────────────────────────────
def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None

# ── GET CURRENT CLIENT ────────────────────────────────────────
def get_current_client(
    token:  str     = Depends(oauth2_scheme),
    db:     Session = Depends(get_db)
):
    """
    Decode the JWT token from the request header
    and return the logged-in client.
    Raises 401 if the token is invalid or expired.
    """
    from backend.models.client import Client

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client_id = payload.get("sub")

    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client = db.query(Client).filter(
        Client.clientID == int(client_id)
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return client

# ── GET CURRENT ADMIN ─────────────────────────────────────────
def get_current_admin(
    token:  str     = Depends(oauth2_scheme),
    db:     Session = Depends(get_db)
):
    """
    Decode the JWT token and verify the user is an administrator.
    Raises 401 if the token is invalid.
    Raises 403 if the user is not an administrator.
    """
    from backend.models.administrator import Administrator

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check the role claim in the token
    role = payload.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )

    admin_id = payload.get("sub")

    admin = db.query(Administrator).filter(
        Administrator.adminID == int(admin_id)
    ).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrator account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin