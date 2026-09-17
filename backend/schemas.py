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

# LOCATION SCHEMA
class LocationResponse(BaseModel):
    locationID:   int
    cityOrCounty: str
    geoScore:     float

    class Config:
        from_attributes = True

# IMAGE SCHEMA
class ImageResponse(BaseModel):
    imageID:      int
    submissionID: int
    filePath:     str
    uploadedAt:   datetime

    class Config:
        from_attributes = True

# PREDICTION SCHEMA
class PredictionResponse(BaseModel):
    predictionID: int
    salePrice:    float
    rentalPrice:  float
    generatedAt:  datetime

    class Config:
        from_attributes = True

# LISTING SCHEMA
class ListingResponse(BaseModel):
    listingID:     int
    listingType:   str
    askingPrice:   float
    contactMethod: str
    contactValue:  str
    status:        str
    createdAt:     datetime

    class Config:
        from_attributes = True

# SUBMISSION SCHEMA
class SubmissionResponse(BaseModel):
    submissionID:    int
    description:     str
    status:          str
    rejectionReason: Optional[str]
    submittedAt:     datetime
    location:        Optional[LocationResponse]
    images:          list[ImageResponse]
    prediction:      Optional[PredictionResponse]
    listing:         Optional[ListingResponse]

    class Config:
        from_attributes = True