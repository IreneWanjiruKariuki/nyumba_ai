from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL                = os.getenv("DATABASE_URL")
SECRET_KEY                  = os.getenv("SECRET_KEY")
ALGORITHM                   = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
UPLOAD_DIR                  = os.getenv("UPLOAD_DIR", "uploads/submissions")
MAX_IMAGE_SIZE_MB           = int(os.getenv("MAX_IMAGE_SIZE_MB", 5))
APP_NAME                    = os.getenv("APP_NAME", "NyumbaAI")
DEBUG                       = os.getenv("DEBUG", "False") == "True"