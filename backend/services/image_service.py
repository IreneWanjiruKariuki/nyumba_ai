import os
import uuid
from fastapi import UploadFile
from backend.config import UPLOAD_DIR, MAX_IMAGE_SIZE_MB

ALLOWED_TYPES = ["image/jpeg", "image/png"]
MAX_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

def validate_image(file: UploadFile) -> str:
    # Validate image type. Returns error message or empty string.
    if file.content_type not in ALLOWED_TYPES:
        return f"{file.filename} must be a JPG or PNG file"
    return ""

async def save_image(file: UploadFile) -> str:
    """
    Save an uploaded image to disk and return the file path.
    Generates a unique filename to avoid collisions.
    """
    # Create uploads directory if it does not exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    extension = file.filename.split('.')[-1].lower()
    unique_name = f"{uuid.uuid4().hex}.{extension}"
    file_path   = os.path.join(UPLOAD_DIR, unique_name)

    # Read and check file size
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise ValueError(
            f"{file.filename} exceeds the "
            f"{MAX_IMAGE_SIZE_MB}MB size limit"
        )

    # Write to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    return file_path