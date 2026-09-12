from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# CLIENT SCHEMAS
class ClientRegister(BaseModel):
    name:     str
    email:    EmailStr
    password: str

class ClientLogin(BaseModel):
    email:    EmailStr
    password: str

class ClientResponse(BaseModel):
    clientID:  int
    name:      str
    email:     str
    createdAt: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    client:       ClientResponse

# ADMIN SCHEMAS
class AdminLogin(BaseModel):
    email:    EmailStr
    password: str

class AdminResponse(BaseModel):
    adminID: int
    name:    str
    email:   str

    class Config:
        from_attributes = True

class AdminTokenResponse(BaseModel):
    access_token:  str
    token_type:    str
    administrator: AdminResponse