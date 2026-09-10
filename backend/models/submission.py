from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Submission(Base):
    __tablename__ = "submissions"

    submissionID    = Column(Integer, primary_key=True, index=True)
    clientID        = Column(Integer, ForeignKey("clients.clientID"), nullable=False)
    locationID      = Column(Integer, ForeignKey("locations.locationID"), nullable=False)
    adminID         = Column(Integer, ForeignKey("administrators.adminID"), nullable=True)
    description     = Column(Text, nullable=False)
    status          = Column(String(20), default="pending", nullable=False)
    rejectionReason = Column(Text, nullable=True)
    submittedAt     = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    client        = relationship("Client", back_populates="submissions")
    location      = relationship("Location", back_populates="submissions")
    administrator = relationship("Administrator", back_populates="submissions")
    images        = relationship("Image", back_populates="submission")
    prediction    = relationship("Prediction", back_populates="submission", uselist=False)
    notifications = relationship("Notification", back_populates="submission")
    listing       = relationship("Listing", back_populates="submission", uselist=False)