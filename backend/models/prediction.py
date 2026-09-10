from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    predictionID = Column(Integer, primary_key=True, index=True)
    submissionID = Column(Integer, ForeignKey("submissions.submissionID"),
                         nullable=False, unique=True)
    salePrice    = Column(Float, nullable=False)
    rentalPrice  = Column(Float, nullable=False)
    generatedAt  = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    submission   = relationship("Submission", back_populates="prediction")
    listing      = relationship("Listing", back_populates="prediction", uselist=False)