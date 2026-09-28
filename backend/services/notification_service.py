from sqlalchemy.orm import Session
from backend.models.notification import Notification

def create_notification(
    db:           Session,
    clientID:     int,
    submissionID: int,
    type:         str,
    message:      str,
) -> Notification:
    """
    Create and store a notification for a client.
    Called automatically when admin approves or rejects a submission.

    type must be either 'approval' or 'rejection'
    """
    notification = Notification(
        clientID      = clientID,
        submissionID  = submissionID,
        type          = type,
        message       = message,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification