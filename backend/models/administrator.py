from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.database import Base

class Administrator(Base):
    __tablename__ = "administrators"

    adminID      = Column(Integer, primary_key=True, index=True)
    name         = Column(String(100), nullable=False)
    email        = Column(String(150), unique=True, nullable=False)
    passwordHash = Column(String(255), nullable=False)

    # Relationships
    submissions  = relationship("Submission", back_populates="administrator")