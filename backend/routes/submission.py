from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.location import Location
from backend.models.submission import Submission
from backend.models.image import Image
from backend.models.client import Client
from backend.schemas import SubmissionResponse
from backend.services.image_service import save_image, validate_image
from backend.utils.auth_helpers import get_current_client

router = APIRouter()

# Get all locations
@router.get("/locations")
def get_locations(db: Session = Depends(get_db)):
    locations = db.query(Location).order_by(Location.cityOrCounty).all()
    return [
        {
            "locationID":   loc.locationID,
            "cityOrCounty": loc.cityOrCounty,
            "geoScore":     loc.geoScore,
        }
        for loc in locations
    ]

# Valid property types
VALID_PROPERTY_TYPES = [
    'Apartment', 'Maisonette', 'Bungalow',
    'Townhouse', 'Villa', 'Bedsitter', 'Studio'
]

# POST /submissions
@router.post(
    "/submissions",
    status_code=status.HTTP_201_CREATED
)
async def create_submission(
    propertyType: str              = Form(...),
    bedrooms:     int              = Form(...),
    bathrooms:    int              = Form(...),
    sizeSqm:      float            = Form(...),
    hasParking:   bool             = Form(False),
    hasDSQ:       bool             = Form(False),
    hasGarden:    bool             = Form(False),
    hasBorehole:  bool             = Form(False),
    isFurnished:  bool             = Form(False),
    locationID:   int              = Form(...),
    images:       List[UploadFile] = File(...),
    db:           Session          = Depends(get_db),
    current_client: Client         = Depends(get_current_client),
):
    # Validate property type
    if propertyType not in VALID_PROPERTY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid property type. Must be one of: "
                   f"{', '.join(VALID_PROPERTY_TYPES)}"
        )

    # Validate bedrooms and bathrooms
    if bedrooms < 0 or bedrooms > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bedrooms must be between 0 and 6"
        )

    if bathrooms < 1 or bathrooms > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bathrooms must be between 1 and 5"
        )

    # Validate size
    if sizeSqm <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Size must be greater than 0"
        )

    # Validate location
    location = db.query(Location).filter(
        Location.locationID == locationID
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    # Validate images
    if not images or len(images) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one image is required"
        )

    for image in images:
        error = validate_image(image)
        if error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error
            )

    # Create submission record
    new_submission = Submission(
        clientID     = current_client.clientID,
        locationID   = locationID,
        propertyType = propertyType,
        bedrooms     = bedrooms,
        bathrooms    = bathrooms,
        sizeSqm      = sizeSqm,
        hasParking   = hasParking,
        hasDSQ       = hasDSQ,
        hasGarden    = hasGarden,
        hasBorehole  = hasBorehole,
        isFurnished  = isFurnished,
        status       = "pending",
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    # Save images
    for image in images:
        try:
            file_path = await save_image(image)
            new_image = Image(
                submissionID = new_submission.submissionID,
                filePath     = file_path,
            )
            db.add(new_image)
        except ValueError as e:
            db.delete(new_submission)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )

    db.commit()

    return {
        "message":      "Submission received successfully",
        "submissionID": new_submission.submissionID,
        "status":       "pending",
    }

# Get all submissions for the current client
@router.get("/submissions", response_model=List[SubmissionResponse])
def get_submissions(
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    submissions = db.query(Submission).filter(
        Submission.clientID == current_client.clientID
    ).order_by(Submission.submittedAt.desc()).all()

    return submissions