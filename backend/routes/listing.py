from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
from backend.models.client import Client
from backend.models.listing import Listing
from backend.models.submission import Submission
from backend.schemas import (
    BrowseListingResponse, ListingCreate, ListingResponse, ListingUpdate
)
from backend.utils.auth_helpers import get_current_client

router = APIRouter()

VALID_LISTING_TYPES   = ["sale", "rent", "both"]
VALID_CONTACT_METHODS = ["phone", "whatsapp", "email"]


def apply_listing_details(listing: Listing, data: ListingUpdate) -> None:
    """
    Validate the owner-editable listing fields and copy them onto the listing.
    Shared by create and update so both enforce the same rules.
    """
    if data.listingType not in VALID_LISTING_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Listing type must be one of: {', '.join(VALID_LISTING_TYPES)}"
        )

    wants_sale   = data.listingType in ("sale", "both")
    wants_rental = data.listingType in ("rent", "both")

    if wants_sale and (data.askingSalePrice is None or data.askingSalePrice <= 0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid sale price"
        )

    if wants_rental and (data.askingRentalPrice is None or data.askingRentalPrice <= 0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid monthly rental price"
        )

    description = data.description.strip()
    if len(description) < 20 or len(description) > 2000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be between 20 and 2000 characters"
        )

    if data.contactMethod not in VALID_CONTACT_METHODS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Contact method must be one of: {', '.join(VALID_CONTACT_METHODS)}"
        )

    contact_value = data.contactValue.strip()
    if len(contact_value) < 5 or len(contact_value) > 150:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter valid contact details"
        )

    # Only the price(s) matching the listing type are kept
    listing.listingType       = data.listingType
    listing.askingSalePrice   = data.askingSalePrice   if wants_sale   else None
    listing.askingRentalPrice = data.askingRentalPrice if wants_rental else None
    listing.description       = description
    listing.contactMethod     = data.contactMethod
    listing.contactValue      = contact_value


# BROWSE ACTIVE LISTINGS
@router.get(
    "/listings",
    response_model=List[BrowseListingResponse],
)
def browse_listings(
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    """All active listings with their property details, newest first."""
    listings = db.query(Listing).options(
        joinedload(Listing.client),
        joinedload(Listing.prediction),
        joinedload(Listing.submission).joinedload(Submission.location),
        joinedload(Listing.submission).joinedload(Submission.images),
    ).filter(
        Listing.status == "active"
    ).order_by(Listing.createdAt.desc()).all()

    results = []
    for listing in listings:
        sub = listing.submission
        results.append(BrowseListingResponse(
            listingID         = listing.listingID,
            listingType       = listing.listingType,
            askingSalePrice   = listing.askingSalePrice,
            askingRentalPrice = listing.askingRentalPrice,
            description       = listing.description,
            contactMethod     = listing.contactMethod,
            contactValue      = listing.contactValue,
            createdAt         = listing.createdAt,
            ownerName         = listing.client.name,
            propertyType      = sub.propertyType,
            bedrooms          = sub.bedrooms,
            bathrooms         = sub.bathrooms,
            sizeSqm           = sub.sizeSqm,
            hasParking        = sub.hasParking,
            hasDSQ            = sub.hasDSQ,
            hasGarden         = sub.hasGarden,
            hasBorehole       = sub.hasBorehole,
            isFurnished       = sub.isFurnished,
            location          = sub.location,
            images            = sub.images,
            prediction        = listing.prediction,
        ))

    return results


# CREATE LISTING
@router.post(
    "/listings",
    response_model=ListingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_listing(
    data:           ListingCreate,
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    """
    List an approved submission for sale, rent, or both.
    Each submission has at most one listing row; listing a property
    again after it was pulled down reactivates that row.
    """
    submission = db.query(Submission).filter(
        Submission.submissionID == data.submissionID,
        Submission.clientID     == current_client.clientID,
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    if submission.status != "approved" or not submission.prediction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved submissions with a price prediction can be listed"
        )

    if submission.listing and submission.listing.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This property is already listed"
        )

    # Reuse the pulled-down listing row if there is one, otherwise create one
    listing = submission.listing or Listing(
        submissionID = submission.submissionID,
        clientID     = current_client.clientID,
    )
    apply_listing_details(listing, data)
    listing.predictionID = submission.prediction.predictionID
    listing.status       = "active"

    db.add(listing)
    db.commit()
    db.refresh(listing)

    return listing


# EDIT LISTING
@router.put(
    "/listings/{listingID}",
    response_model=ListingResponse,
)
def update_listing(
    listingID:      int,
    data:           ListingUpdate,
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    """Edit the details of one of the owner's active listings."""
    listing = db.query(Listing).filter(
        Listing.listingID == listingID,
        Listing.clientID  == current_client.clientID,
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active listings can be edited"
        )

    apply_listing_details(listing, data)
    db.commit()
    db.refresh(listing)

    return listing


# PULL DOWN LISTING
@router.put(
    "/listing/{listingID}/pulldown",
    response_model=ListingResponse,
)
def pull_down_listing(
    listingID:      int,
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    """Take an active listing off the market. The owner can list it again later."""
    listing = db.query(Listing).filter(
        Listing.listingID == listingID,
        Listing.clientID  == current_client.clientID,
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is not active"
        )

    listing.status = "inactive"
    db.commit()
    db.refresh(listing)

    return listing
