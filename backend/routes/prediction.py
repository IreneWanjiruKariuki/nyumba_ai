from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from backend.services.prediction_service import predict_prices

router = APIRouter()


# Request body (input schema) 
# FastAPI reads this class and auto-generates the Swagger UI form at /docs.
# The Field(...) means required; Field(False) means optional with default False.
class PredictRequest(BaseModel):
    propertyType: str   = Field(..., examples=["Apartment", "Townhouse", "Maisonette", "Bungalow", "Villa"])
    location:     str   = Field(..., examples=["Kilimani", "Karen", "Westlands"])
    bedrooms:     int   = Field(..., ge=1, le=10)   # ge = greater-or-equal, le = less-or-equal
    bathrooms:    int   = Field(..., ge=1, le=10)
    sizeSqm:      float = Field(..., gt=0, le=2000)
    hasParking:   bool  = False
    hasDSQ:       bool  = False
    hasGarden:    bool  = False
    hasBorehole:  bool  = False
    isFurnished:  bool  = False


# Response shape
class PredictResponse(BaseModel):
    predicted_sale_price:   int
    predicted_rental_price: int
    location:               str
    geo_score:              float


# Endpoint
@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict sale and rental price for a Nairobi property",
)
def predict(body: PredictRequest) -> PredictResponse:
    try:
        result = predict_prices(
            property_type = body.propertyType,
            location      = body.location,
            bedrooms      = body.bedrooms,
            bathrooms     = body.bathrooms,
            size_sqm      = body.sizeSqm,
            has_parking   = body.hasParking,
            has_dsq       = body.hasDSQ,
            has_garden    = body.hasGarden,
            has_borehole  = body.hasBorehole,
            is_furnished  = body.isFurnished,
        )
    except FileNotFoundError as exc:
        # Model files missing — server is misconfigured
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        # Unknown propertyType or location string
        raise HTTPException(status_code=422, detail=str(exc))

    return PredictResponse(**result)