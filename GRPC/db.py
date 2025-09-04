from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load 
load_dotenv()

# Ambil URI dari environment
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)

# Pilih database dan koleksi
db = client["concerts"]
users = db["users"]
konser = db["konser"]
pemesanan = db["pemesanan"]

