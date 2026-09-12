from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.client import Client
from backend.models.administrator import Administrator
from backend.schemas import (
    ClientRegister, ClientLogin, TokenResponse,
    AdminLogin, AdminTokenResponse
)
from backend.utils.hashing import hash_password, verify_password
from backend.utils.auth_helpers import create_access_token

router = APIRouter()

# CLIENT REGISTER
@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(data: ClientRegister, db: Session = Depends(get_db)):

    # Check if email already exists
    existing = db.query(Client).filter(Client.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # Create new client
    new_client = Client(
        name         = data.name,
        email        = data.email,
        passwordHash = hash_password(data.password)
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    return {"message": "Account created successfully"}

# CLIENT LOGIN
@router.post("/auth/login", response_model=TokenResponse)
def login(data: ClientLogin, db: Session = Depends(get_db)):

    # Find the client by email
    client = db.query(Client).filter(Client.email == data.email).first()

    # Verify email and password
    if not client or not verify_password(data.password, client.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create JWT token with client ID inside
    token = create_access_token(data={"sub": str(client.clientID)})

    return {
        "access_token": token,
        "token_type":   "bearer",
        "client": {
            "clientID":  client.clientID,
            "name":      client.name,
            "email":     client.email,
            "createdAt": client.createdAt,
        }
    }

# ADMIN LOGIN
@router.post("/admin/login", response_model=AdminTokenResponse)
def admin_login(data: AdminLogin, db: Session = Depends(get_db)):

    # Find the administrator by email
    admin = db.query(Administrator).filter(
        Administrator.email == data.email
    ).first()

    # Verify email and password
    if not admin or not verify_password(data.password, admin.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect administrator email or password"
        )

    # Create JWT token with admin ID inside
    token = create_access_token(data={"sub": str(admin.adminID), "role": "admin"})

    return {
        "access_token": token,
        "token_type":   "bearer",
        "administrator": {
            "adminID": admin.adminID,
            "name":    admin.name,
            "email":   admin.email,
        }
    }