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
from backend.services.prediction_service import ModelLoadError, predict_prices

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
    Runs the price prediction pipeline, updates status to approved,
    records the adminID, saves the predicted prices,
    and sends an approval notification to the owner.
    If the prediction fails, nothing is changed so the admin can retry.
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

    # Run the prediction pipeline BEFORE changing anything,
    # so a failed prediction leaves the submission pending
    location_name = (
        submission.location.cityOrCounty
        if submission.location else "your area"
    )
    try:
        result = predict_prices(
            property_type = submission.propertyType,
            location      = location_name,
            bedrooms      = submission.bedrooms,
            bathrooms     = submission.bathrooms,
            size_sqm      = submission.sizeSqm,
            has_parking   = submission.hasParking,
            has_dsq       = submission.hasDSQ,
            has_garden    = submission.hasGarden,
            has_borehole  = submission.hasBorehole,
            is_furnished  = submission.isFurnished,
        )
    except (FileNotFoundError, ModelLoadError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Price prediction failed, submission not approved: {exc}"
        )

    sale_price   = result["predicted_sale_price"]
    rental_price = result["predicted_rental_price"]

    # Update submission status and save the prediction together
    submission.status  = "approved"
    submission.adminID = current_admin.adminID

    new_prediction = Prediction(
        submissionID = submission.submissionID,
        salePrice    = sale_price,
        rentalPrice  = rental_price,
    )
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    # Send approval notification to owner
    create_notification(
        db           = db,
        clientID     = submission.clientID,
        submissionID = submission.submissionID,
        type         = "approval",
        message      = (
            f"Your submission has been approved. "
            f"Your property in {location_name} has an estimated "
            f"sale price of KES {sale_price:,} and an estimated "
            f"rental price of KES {rental_price:,}/month. "
            f"View the details on your dashboard."
        )
    )

    return {
        "message":      "Submission approved successfully",
        "submissionID": submission.submissionID,
        "status":       "approved",
        "salePrice":    sale_price,
        "rentalPrice":  rental_price,
    }

# REJECT SUBMISSION
@router.put("/admin/submissions/{submissionID}/reject")
def reject_submission(
    submissionID:  int,
    data:          RejectSubmission,
    db:            Session       = Depends(get_db),
    current_admin: Administrator = Depends(get_current_admin),
):
    """
    Reject a submission with a reason.
    Updates status to rejected, stores the rejection reason,
    and sends a rejection notification to the owner.
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

    if not data.reason or len(data.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rejection reason must be at least 5 characters"
        )

    # Update submission status
    submission.status          = "rejected"
    submission.adminID         = current_admin.adminID
    submission.rejectionReason = data.reason.strip()
    db.commit()

    # Send rejection notification to owner
    create_notification(
        db           = db,
        clientID     = submission.clientID,
        submissionID = submission.submissionID,
        type         = "rejection",
        message      = (
            f"Your submission has been rejected. "
            f"Reason: {data.reason.strip()}. "
            f"Please correct the issues and resubmit."
        )
    )

    return {
        "message":      "Submission rejected successfully",
        "submissionID": submission.submissionID,
        "status":       "rejected",
    }