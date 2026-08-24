from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import DATABASE_URL

# Create the database engine
engine = create_engine(DATABASE_URL)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the base class for all models
Base = declarative_base()

# Dependency — used in route files to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()