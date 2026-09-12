from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import engine, Base, get_db
from backend.models import (
    Client, Administrator, Location, Submission,
    Image, Prediction, Listing, Notification
)
from backend.routes import auth
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI app
app = FastAPI(title="NyumbaAI", version="1.0.0")

# Allows the frontend to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables in the database on startup
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router)

# Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to NyumbaAI"}

# Health check endpoint
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