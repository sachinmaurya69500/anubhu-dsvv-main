#!/usr/bin/env python3
"""
Admin User Reset Script for Anubhuti Portal
This script resets/creates the admin user in MongoDB
"""

import os
import sys
from datetime import datetime
import bcrypt
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
MONGODB_URI = os.getenv('MONGODB_URI')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@dsvv.ac.in')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Admin@123')
ADMIN_NAME = os.getenv('ADMIN_NAME', 'Administrator')

def reset_admin():
    """Reset/create admin user in MongoDB"""
    
    # Validate MongoDB URI
    if not MONGODB_URI or 'username:password' in MONGODB_URI:
        print("❌ Error: MongoDB URI not configured properly in .env file")
        print("   Please update MONGODB_URI with your actual MongoDB connection string")
        print("   Get one at: https://www.mongodb.com/cloud/atlas")
        return False
    
    try:
        # Connect to MongoDB
        print(f"🔗 Connecting to MongoDB...")
        client = MongoClient(MONGODB_URI, server_api=ServerApi('1'), serverSelectionTimeoutMS=5000)
        
        # Verify connection
        client.server_info()
        print("✓ Connected to MongoDB successfully")
        
        # Get database and collection
        db = client['anubhuti']
        admins = db['adminusers']
        
        # Generate password hash
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        
        # Reset admin user
        result = admins.update_one(
            {'email': ADMIN_EMAIL.lower()},
            {'$set': {
                'name': ADMIN_NAME,
                'email': ADMIN_EMAIL.lower(),
                'passwordHash': pw_hash,
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow(),
            }},
            upsert=True
        )
        
        if result.upserted_id:
            print(f"\n✅ Admin user created successfully!")
        else:
            print(f"\n✅ Admin user reset successfully!")
        
        print(f"\n📋 Admin Credentials:")
        print(f"   Email:    {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Name:     {ADMIN_NAME}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("  ANUBHUTI - Admin User Reset")
    print("=" * 60)
    
    success = reset_admin()
    
    if success:
        print("\n✅ Admin reset completed successfully!")
        print("You can now log in with the credentials above.")
    else:
        print("\n❌ Admin reset failed. Please check your MongoDB configuration.")
        sys.exit(1)

if __name__ == '__main__':
    main()
