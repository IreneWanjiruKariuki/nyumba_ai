from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.location import Location

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