import os
from io import BytesIO
from datetime import datetime, timedelta
import os
from io import BytesIO
from datetime import datetime
from PIL import Image

"""Standalone test for image validation and thumbnail generation.
This mirrors the server-side logic without touching MongoDB or importing the app module.
"""

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOAD_DIR = os.path.join(STATIC_DIR, 'uploads')
THUMB_DIR = os.path.join(UPLOAD_DIR, 'thumbs')
os.makedirs(THUMB_DIR, exist_ok=True)

def create_test_jpeg(width=800, height=600, color=(200,150,100)):
    img = Image.new('RGB', (width, height), color=color)
    bio = BytesIO()
    img.save(bio, format='JPEG', quality=85)
    bio.seek(0)
    return bio

def validate_and_save(file_stream, filename):
    # Read bytes
    data = file_stream.read()
    MAX_BYTES = 500 * 1024
    if len(data) > MAX_BYTES:
        return False, 'too_large', None, None

    try:
        img = Image.open(BytesIO(data))
        fmt = (img.format or '').upper()
        if fmt not in ('JPEG', 'JPG'):
            return False, 'bad_format', None, None
    except Exception:
        return False, 'invalid_image', None, None

    # Save original
    ts = int(datetime.utcnow().timestamp())
    safe_name = f"{ts}_{filename}"
    save_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(save_path, 'wb') as f:
        f.write(data)
    photo_url = f"/static/uploads/{safe_name}"

    # Create thumbnail
    try:
        thumb_size = (420, 280)
        img = Image.open(save_path).convert('RGB')
        img.thumbnail((max(thumb_size)*2, max(thumb_size)*2), Image.LANCZOS)
        w,h = img.size
        left = max(0, (w - thumb_size[0]) // 2)
        top = max(0, (h - thumb_size[1]) // 2)
        right = left + thumb_size[0]
        bottom = top + thumb_size[1]
        cropped = img.crop((left, top, right, bottom))
        thumb_name = f"thumb_{safe_name}"
        thumb_path = os.path.join(THUMB_DIR, thumb_name)
        cropped.save(thumb_path, format='JPEG', quality=85)
        thumb_url = f"/static/uploads/thumbs/{thumb_name}"
    except Exception:
        thumb_url = None

    return True, None, photo_url, thumb_url

if __name__ == '__main__':
    bio = create_test_jpeg()
    ok, reason, purl, turl = validate_and_save(bio, 'photo.jpg')
    print('OK:', ok)
    print('Reason:', reason)
    print('Photo URL:', purl)
    print('Thumb URL:', turl)
    if purl:
        print('Photo exists:', os.path.exists(os.path.join(UPLOAD_DIR, purl.split('/static/uploads/')[-1])))
    if turl:
        print('Thumb exists:', os.path.exists(os.path.join(THUMB_DIR, turl.split('/static/uploads/thumbs/')[-1])))
    
