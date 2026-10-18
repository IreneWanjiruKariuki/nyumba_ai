from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Listing(Base):
    __tablename__ = "listings"

    listingID     = Column(Integer, primary_key=True, index=True)
    submissionID  = Column(Integer, ForeignKey("submissions.submissionID"), nullable=False)
    clientID      = Column(Integer, ForeignKey("clients.clientID"), nullable=False)
    predictionID  = Column(Integer, ForeignKey("predictions.predictionID"), nullable=False)
    listingType   = Column(String(10), nullable=False)   # sale | rent | both
    # Only the price(s) matching listingType are set; the other stays NULL
    askingSalePrice   = Column(Float, nullable=True)
    askingRentalPrice = Column(Float, nullable=True)
    description   = Column(Text, nullable=False, default="")
    contactMethod = Column(String(20), nullable=False)
    contactValue  = Column(String(150), nullable=False)
    status        = Column(String(20), default="active", nullable=False)
    createdAt     = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    submission  = relationship("Submission", back_populates="listing")
    client      = relationship("Client", back_populates="listings")
    prediction  = relationship("Prediction", back_populates="listing")