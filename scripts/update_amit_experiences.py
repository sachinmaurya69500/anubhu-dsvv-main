"""
Script: update_amit_experiences.py
Purpose:
- Find Amit's 2026 submission in the MongoDB `submissions` collection.
- Delete any existing submissions with `year: 2025` (or matching date range) to remove old 2025 experiences.
- Insert 12 entries for 2025 and 12 entries for 2024 replicating Amit's 2026 experience, with minor unique ids/timestamps.

Usage:
- Ensure MongoDB is running and accessible (default: mongodb://localhost:27017).
- Adjust `MONGO_URI` and `DB_NAME` below if needed.
- Run: python scripts/update_amit_experiences.py

The script prompts before making destructive changes.
"""

from datetime import datetime, timedelta
import time
import copy
import uuid
import os

from pymongo import MongoClient

# Configuration - change if your MongoDB is elsewhere
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'anubhuti')
COLLECTION = os.environ.get('COLLECTION', 'submissions')

# The canonical description to use
DESCRIPTION = (
    "Our social internship experience at Dev Sanskriti Vishwavidyalaya was highly inspiring and meaningful. "
    "As a group of three students — Amit, Abhishek, and Gautam — we actively participated in several social and spiritual "
    "activities aimed at spreading awareness and positive values in society. During the internship, we organized and "
    "participated in Yagya programs to promote spiritual and cultural awareness among people.\n\n"

    "We also visited nearly 80 schools where we delivered motivational and value-based lectures to students on topics such as "
    "moral education, discipline, health, and the importance of Indian culture. These sessions helped us improve our public speaking "
    "and communication skills while inspiring young students toward positive living.\n\n"

    "Another major part of our internship was connecting new people with the All World Gayatri Pariwar by spreading awareness about "
    "its social and spiritual mission. This experience taught us teamwork, leadership, confidence, and social responsibility, making the "
    "internship a truly life-changing journey for all of us."
)

# Helper to create a new document from template
def make_doc(template, year, idx):
    doc = copy.deepcopy(template)
    # Remove _id if present
    doc.pop('_id', None)
    # Update fields: year, published/submitted date, id
    doc['year'] = int(year)
    # create a unique id
    doc['id'] = f"amit-{year}-{idx}-{uuid.uuid4().hex[:8]}"
    # ensure studentName/organization/summary fields
    doc['studentName'] = doc.get('studentName', 'Amit')
    doc['organization'] = doc.get('organization', 'Dev Sanskriti Vishwavidyalaya')
    doc['summary'] = DESCRIPTION
    doc['summaryPreview'] = DESCRIPTION[:220] + '...'
    # set status to approved so it appears in gallery/archive
    doc['status'] = 'approved'
    # set submittedAt and publishedAt to dates in that year
    # spread them across months
    base_date = datetime(int(year), 1, 10)
    doc['submittedAt'] = (base_date + timedelta(days=idx * 7)).isoformat()
    doc['publishedAt'] = doc['submittedAt']
    # add a small gallery placeholder if not present
    if not doc.get('gallery'):
        doc['gallery'] = []
    # ensure avatar/photo fields
    if not doc.get('photo') and not doc.get('avatarUrl'):
        doc['avatarUrl'] = '/assets/Dev_Sanskriti_Vishwavidyalaya.png'
    return doc


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    coll = db[COLLECTION]

    # Find Amit's 2026 submission as template
    print('Searching for Amit 2026 submission...')
    template = coll.find_one({
        '$or': [
            {'studentName': 'Amit'},
            {'studentName': {'$regex': '^Amit', '$options': 'i'}}
        ],
        'year': 2026
    })

    if not template:
        print('No template document found for Amit in 2026. Trying fallback search...')
        template = coll.find_one({'studentName': {'$regex': '^Amit', '$options': 'i'}})

    if not template:
        print('ERROR: Could not find any document for Amit to use as template. Aborting.')
        return

    print('Template found. Document id:', template.get('id') or template.get('_id'))
    print('\nPlanned actions:')
    print('- Delete existing submissions with year 2025')
    print('- Insert 12 documents for year 2025 based on Amit template')
    print('- Insert 12 documents for year 2024 based on Amit template')

    confirm = input('\nProceed with these changes? Type YES to continue: ')
    if confirm.strip() != 'YES':
        print('Aborted by user.')
        return

    # Delete previous 2025 experiences
    delete_result = coll.delete_many({'year': 2025})
    print(f'Deleted {delete_result.deleted_count} documents for year 2025.')

    # Insert new documents
    to_insert = []
    for idx in range(12):
        to_insert.append(make_doc(template, 2025, idx + 1))
    for idx in range(12):
        to_insert.append(make_doc(template, 2024, idx + 1))

    if to_insert:
        ins = coll.insert_many(to_insert)
        print(f'Inserted {len(ins.inserted_ids)} new documents for 2025 and 2024.')
    else:
        print('No documents prepared to insert.')

    print('Done.')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('Error during operation:', e)
