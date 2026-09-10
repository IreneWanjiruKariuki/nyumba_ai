from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import engine, Base, get_db
from backend.models import (
    Client, Administrator, Location, Submission,
    Image, Prediction, Listing, Notification
)

# Create the FastAPI app
app = FastAPI(title="NyumbaAI", version="1.0.0")

# Create all tables in the database on startup
Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Welcome to NyumbaAI"}
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "app": "NyumbaAI"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(e)
        }