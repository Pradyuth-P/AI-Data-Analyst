from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Initialize Async MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URL)

# Get default database defined in the connection URI, or fall back to 'ai_analyst_db'
try:
    db = client.get_default_database()
except Exception:
    db = client["ai_analyst_db"]

async def get_db():
    """Yields active MongoDB database instance (NoSQL context)."""
    yield db
