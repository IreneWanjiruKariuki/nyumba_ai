from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models.submission import Submission
from backend.models.client import Client
from backend.models.administrator import Administrator
from backend.models.prediction import Prediction
from backend.schemas import AdminSubmissionResponse, RejectSubmission
from backend.utils.auth_helpers import get_current_admin
from backend.services.notification_service import create_notification

router = APIRouter()

# GET ALL SUBMISSIONS
@router.get(
    "/admin/submissions",
    response_model=List[AdminSubmissionResponse]
)
def get_all_submissions(
    db:            Session       = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Returns all submissions for the admin dashboard."""
    submissions = db.query(Submission).options(
        joinedload(Submission.client),
        joinedload(Submission.location),
        joinedload(Submission.images),
        joinedload(Submission.prediction),
    ).order_by(Submission.submittedAt.desc()).all()

    return submissions

# GET SINGLE SUBMISSION
@router.get(
    "/admin/submissions/{submissionID}",
    response_model=AdminSubmissionResponse
)
def get_single_submission(
    submissionID:  int,
    db:            Session       = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """Returns a single submission for the admin review page."""
    submission = db.query(Submission).options(
        joinedload(Submission.client),
        joinedload(Submission.location),
        joinedload(Submission.images),
        joinedload(Submission.prediction),
    ).filter(
        Submission.submissionID == submissionID
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    return submission

# APPROVE SUBMISSION
@router.put("/admin/submissions/{submissionID}/approve")
def approve_submission(
    submissionID:  int,
    db:            Session       = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """
    Approve a submission.
    Updates status to approved, records the adminID,
    creates a placeholder prediction record,
    and sends an approval notification to the owner.

    """
    submission = db.query(Submission).options(
        joinedload(Submission.client),
        joinedload(Submission.location),
    ).filter(
        Submission.submissionID == submissionID
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    if submission.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Submission is already {submission.status}"
        )

    # Update submission status
    submission.status  = "approved"
    submission.adminID = current_admin.adminID
    db.commit()

    # Create placeholder prediction
    # Real values will be filled in Week 4 by the ML pipeline
    new_prediction = Prediction(
        submissionID = submission.submissionID,
        salePrice    = 0.0,
        rentalPrice  = 0.0,
    )
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    # Send approval notification to owner
    location_name = (
        submission.location.cityOrCounty
        if submission.location else "your area"
    )
    create_notification(
        db           = db,
        clientID     = submission.clientID,
        submissionID = submission.submissionID,
        type         = "approval",
        message      = (
            f"Your submission has been approved. "
            f"Your property in {location_name} is being "
            f"processed for price prediction. "
            f"You will receive your sale and rental "
            f"price estimates shortly."
        )
    )

    return {
        "message":      "Submission approved successfully",
        "submissionID": submission.submissionID,
        "status":       "approved",
    }