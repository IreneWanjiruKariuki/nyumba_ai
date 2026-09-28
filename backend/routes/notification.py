from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.notification import Notification
from backend.models.client import Client
from backend.schemas import NotificationResponse
from backend.utils.auth_helpers import get_current_client

router = APIRouter()

# GET /notifications
@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    db:             Session = Depends(get_db),
    current_client: Client  = Depends(get_current_client),
):
    """
    Returns all notifications for the currently logged-in client
    ordered by most recent first.
    """
    notifications = db.query(Notification).filter(
        Notification.clientID == current_client.clientID
    ).order_by(Notification.sentAt.desc()).all()

    return notifications