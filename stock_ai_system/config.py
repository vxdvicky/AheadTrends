import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Variable ke names pass karein, actual URLs ya keys nahi
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL aur SUPABASE_KEY .env file mein set nahi hua!")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)