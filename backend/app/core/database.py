from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Initialize Async MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URL)

# Get default database defined in the connection URI
db = client.get_default_database()

async def get_db():
    """Yields active MongoDB database instance (NoSQL context)."""
    yield db
