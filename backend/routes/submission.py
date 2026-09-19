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

# GET ALL LOCATIONS
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

# POST (CREATE NEW SUBMISSION)
@router.post(
    "/submissions",
    status_code=status.HTTP_201_CREATED
)
async def create_submission(
    description: str        = Form(...),
    locationID:  int        = Form(...),
    images:      List[UploadFile] = File(...),
    db:          Session    = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    # ── Validate description ──────────────────────────────────
    if not description or len(description.strip()) < 30:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be at least 30 characters"
        )

    # ── Validate location ─────────────────────────────────────
    location = db.query(Location).filter(
        Location.locationID == locationID
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    # ── Validate images ───────────────────────────────────────
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

    # ── Create submission record ──────────────────────────────
    new_submission = Submission(
        clientID    = current_client.clientID,
        locationID  = locationID,
        description = description.strip(),
        status      = "pending",
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    # ── Save images and create Image records ──────────────────
    for image in images:
        try:
            file_path = await save_image(image)
            new_image = Image(
                submissionID = new_submission.submissionID,
                filePath     = file_path,
            )
            db.add(new_image)
        except ValueError as e:
            # Clean up the submission if an image fails
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