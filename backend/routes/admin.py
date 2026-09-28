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