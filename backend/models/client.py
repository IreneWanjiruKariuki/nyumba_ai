from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Client(Base):
    __tablename__ = "clients"

    clientID     = Column(Integer, primary_key=True, index=True)
    name         = Column(String(100), nullable=False)
    email        = Column(String(150), unique=True, nullable=False)
    passwordHash = Column(String(255), nullable=False)
    createdAt    = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    submissions   = relationship("Submission", back_populates="client")
    notifications = relationship("Notification", back_populates="client")
    listings      = relationship("Listing", back_populates="client")