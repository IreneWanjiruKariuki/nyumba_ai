from sqlalchemy import (
    Column, Integer, String, Float,
    Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Submission(Base):
    __tablename__ = "submissions"

    submissionID    = Column(Integer, primary_key=True, index=True)
    clientID        = Column(Integer, ForeignKey("clients.clientID"),
                             nullable=False)
    locationID      = Column(Integer, ForeignKey("locations.locationID"),
                             nullable=False)
    adminID         = Column(Integer, ForeignKey("administrators.adminID"),
                             nullable=True)

    # ── Structured property fields ────────────────────────────
    propertyType    = Column(String(20),  nullable=False)
    bedrooms        = Column(Integer,     nullable=False)
    bathrooms       = Column(Integer,     nullable=False)
    sizeSqm         = Column(Float,       nullable=False)
    hasParking      = Column(Boolean,     default=False, nullable=False)
    hasDSQ          = Column(Boolean,     default=False, nullable=False)
    hasGarden       = Column(Boolean,     default=False, nullable=False)
    hasBorehole     = Column(Boolean,     default=False, nullable=False)

    # ── Submission metadata ───────────────────────────────────
    status          = Column(String(20),  default="pending", nullable=False)
    rejectionReason = Column(Text,        nullable=True)
    submittedAt     = Column(DateTime,    default=datetime.utcnow,
                             nullable=False)

    # ── Relationships ─────────────────────────────────────────
    client        = relationship("Client",
                                 back_populates="submissions")
    location      = relationship("Location",
                                 back_populates="submissions")
    administrator = relationship("Administrator",
                                 back_populates="submissions")
    images        = relationship("Image",
                                 back_populates="submission")
    prediction    = relationship("Prediction",
                                 back_populates="submission",
                                 uselist=False)
    notifications = relationship("Notification",
                                 back_populates="submission")
    listing       = relationship("Listing",
                                 back_populates="submission",
                                 uselist=False)