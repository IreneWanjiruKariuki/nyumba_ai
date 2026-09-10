from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Image(Base):
    __tablename__ = "images"

    imageID      = Column(Integer, primary_key=True, index=True)
    submissionID = Column(Integer, ForeignKey("submissions.submissionID"), nullable=False)
    filePath     = Column(String(500), nullable=False)
    uploadedAt   = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    submission   = relationship("Submission", back_populates="images")