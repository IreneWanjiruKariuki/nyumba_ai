from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from backend.database import Base

class Location(Base):
    __tablename__ = "locations"

    locationID   = Column(Integer, primary_key=True, index=True)
    cityOrCounty = Column(String(100), unique=True, nullable=False)
    geoScore     = Column(Float, nullable=False)

    # Relationships
    submissions  = relationship("Submission", back_populates="location")