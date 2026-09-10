from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    notificationID = Column(Integer, primary_key=True, index=True)
    clientID       = Column(Integer, ForeignKey("clients.clientID"), nullable=False)
    submissionID   = Column(Integer, ForeignKey("submissions.submissionID"), nullable=False)
    type           = Column(String(20), nullable=False)
    message        = Column(Text, nullable=False)
    sentAt         = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    client     = relationship("Client", back_populates="notifications")
    submission = relationship("Submission", back_populates="notifications")