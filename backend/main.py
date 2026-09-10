from fastapi import FastAPI
from backend.database import engine, Base
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