import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from io import BytesIO
import jwt
import bcrypt
from flask import Flask, jsonify, request, send_file, send_from_directory, render_template, redirect
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from dotenv import load_dotenv

load_dotenv()

# Configuration
PORT = int(os.getenv('PORT', 3000))
MONGODB_URI = os.getenv('MONGODB_URI')
JWT_SECRET = os.getenv('JWT_SECRET')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
ADMIN_NAME = os.getenv('ADMIN_NAME', 'Admin')
COOKIE_NAME = 'anubhuti_admin'
STUDENT_COOKIE_NAME = 'anubhuti_student'
IS_PRODUCTION = os.getenv('NODE_ENV') == 'production'

# Validate configuration
for var, name in [(MONGODB_URI, 'MONGODB_URI'), (JWT_SECRET, 'JWT_SECRET'), 
                   (ADMIN_EMAIL, 'ADMIN_EMAIL'), (ADMIN_PASSWORD, 'ADMIN_PASSWORD')]:
    if not var:
        raise ValueError(f'Missing {name}. Check your .env file.')

app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='templates')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.jinja_env.auto_reload = True


def _avatar_storage_candidates():
    """Return avatar upload directories in preferred order."""
    configured = os.getenv('AVATAR_UPLOAD_DIR', '').strip()
    candidates = []
    if configured:
        candidates.append(configured)

    # Local/dev preferred path
    candidates.append(os.path.join(app.static_folder or 'static', 'uploads', 'avatars'))

    # Serverless/container fallback writable path
    candidates.append('/tmp/anubhuti_uploads/avatars')

    # Preserve order while removing duplicates
    seen = set()
    unique = []
    for path in candidates:
        if path and path not in seen:
            seen.add(path)
            unique.append(path)
    return unique


def save_avatar_file(photo):
    """Save avatar to a writable location and return public URL.

    This supports read-only deploy targets (e.g., /var/task) by falling back to /tmp.
    """
    if not photo or not getattr(photo, 'filename', ''):
        return None

    filename = secure_filename(f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{photo.filename}")
    last_error = None

    for uploads_dir in _avatar_storage_candidates():
        try:
            os.makedirs(uploads_dir, exist_ok=True)
            save_path = os.path.join(uploads_dir, filename)
            photo.stream.seek(0)
            photo.save(save_path)
            return f"/api/uploads/avatars/{filename}"
        except OSError as e:
            # Try next candidate for read-only/permission-related failures
            last_error = e
            continue

    if last_error:
        raise last_error
    raise OSError('Unable to save avatar file.')


@app.route('/api/uploads/avatars/<path:filename>', methods=['GET'])
def get_uploaded_avatar(filename):
    """Serve uploaded avatar images from writable storage locations."""
    try:
        safe_filename = secure_filename(filename)
        for uploads_dir in _avatar_storage_candidates():
            file_path = os.path.join(uploads_dir, safe_filename)
            if os.path.exists(file_path):
                return send_from_directory(uploads_dir, safe_filename)
        return jsonify({'message': 'Avatar not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.context_processor
def inject_auth():
    """Inject auth_role and current_user into all templates."""
    try:
        admin = verify_auth()
    except Exception:
        admin = None
    try:
        student = verify_student_auth()
    except Exception:
        student = None

    if admin:
        return {'auth_role': 'admin', 'current_user': admin}
    if student:
        return {'auth_role': 'student', 'current_user': student}
    return {'auth_role': None, 'current_user': None}


def get_request_data():
    """Return request payload from JSON or form-encoded bodies."""
    if request.is_json:
        return request.get_json(silent=True) or {}
    if request.form:
        return request.form.to_dict(flat=True)
    return {}

# Database setup
try:
    client = MongoClient(MONGODB_URI, server_api=ServerApi('1'), serverSelectionTimeoutMS=5000)
    db = client['anubhuti']
    # Verify connection
    client.server_info()
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    print("Please ensure MONGODB_URI in .env points to a valid MongoDB instance.")
    print("Get a free cluster at https://www.mongodb.com/cloud/atlas")
    raise

admins = db['adminusers']
students = db['studentusers']
student_activity = db['student_activity']
forms = db['forms']
volumes = db['volumes']
submissions = db['submissions']
visitors = db['visitors']

def to_client(doc):
    """Convert MongoDB document to client format."""
    if not doc:
        return None
    doc['id'] = str(doc.pop('_id', ''))
    # Convert all ObjectId fields to strings
    for key in doc:
        if isinstance(doc[key], ObjectId):
            doc[key] = str(doc[key])
    return doc

def seed_database():
    """Initialize database with admin and default collections."""
    try:
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        admins.update_one(
            {'email': ADMIN_EMAIL.lower()},
            {'$set': {'name': ADMIN_NAME, 'email': ADMIN_EMAIL.lower(), 'passwordHash': pw_hash}},
            upsert=True
        )
        
        if volumes.count_documents({}) == 0:
            volumes.insert_many([
                {
                    'volumeLabel': 'Volume I',
                    'year': '2024-25',
                    'publishedAt': '2025-03-20',
                    'description': 'Foundation entries capturing early internship reflections.',
                    'items': 4,
                    'createdAt': datetime.now(timezone.utc),
                },
                {
                    'volumeLabel': 'Volume II',
                    'year': '2025-26',
                    'publishedAt': '2026-02-11',
                    'description': 'Internship experiences focused on skill-building.',
                    'items': 8,
                    'createdAt': datetime.now(timezone.utc),
                },
            ])
        
        if forms.count_documents({}) == 0:
            forms.insert_many([
                {
                    'title': 'Summer Internship Experience 2026',
                    'category': 'Internship',
                    'deadline': '2026-06-15',
                    'description': 'Share your internship role, responsibilities, and reflections.',
                    'volumeId': '',
                    'status': 'active',
                    'submissionCount': 0,
                    'createdAt': datetime.now(timezone.utc),
                },
                {
                    'title': 'Field Practice Reflection',
                    'category': 'Field Work',
                    'deadline': '2026-07-01',
                    'description': 'Share observations from practical field work.',
                    'volumeId': '',
                    'status': 'active',
                    'submissionCount': 0,
                    'createdAt': datetime.now(timezone.utc),
                },
            ])
        
        # Add dummy submissions for carousel/archive
        if submissions.count_documents({}) == 0:
            # Get the first form ID
            sample_form = forms.find_one({})
            form_id = sample_form['_id'] if sample_form else None
            
            if form_id:
                submissions.insert_many([
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Rahul Kumar',
                        'email': 'rahul.kumar@dsvv.ac.in',
                        'rollNumber': 'DSV2022001',
                        'programme': 'B.Tech Computer Science',
                        'organization': 'Tech Corp India',
                        'mentor': 'Mr. Amit Sharma',
                        'duration': '3 months (May-July 2025)',
                        'summary': 'My internship at Tech Corp India was transformative. I worked on real-world projects involving cloud infrastructure and DevOps. Collaborated with talented professionals and gained practical experience that complemented my academic learning. The mentorship I received from senior engineers has shaped my career trajectory significantly. Highly recommend this organization for students interested in technology.',
                        'status': 'approved',
                        'submittedAt': '2025-08-15',
                        'createdAt': datetime.now(timezone.utc),
                    },
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Priya Singh',
                        'email': 'priya.singh@dsvv.ac.in',
                        'rollNumber': 'DSV2022045',
                        'programme': 'B.A. Marketing & Communication',
                        'organization': 'Marketing Solutions Ltd',
                        'mentor': 'Ms. Neetu Sharma',
                        'duration': '2 months (June-July 2025)',
                        'summary': 'During my marketing internship at MSL, I developed comprehensive digital campaign strategies that directly impacted business metrics. Worked with SEO, SEM, and social media marketing. The hands-on experience with marketing tools and customer insights has prepared me well for my post-graduation role. Highly recommend this opportunity to anyone interested in digital marketing.',
                        'status': 'approved',
                        'submittedAt': '2025-08-20',
                        'createdAt': datetime.now(timezone.utc),
                    },
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Arjun Patel',
                        'email': 'arjun.patel@dsvv.ac.in',
                        'rollNumber': 'DSV2022087',
                        'programme': 'B.Com Finance',
                        'organization': 'Finance Advisory Group',
                        'mentor': 'Mr. Vikram Gupta',
                        'duration': '4 months (May-August 2025)',
                        'summary': 'The finance internship program at FAG was rigorous and rewarding. I analyzed financial statements, participated in client meetings, and contributed to strategic recommendations. Worked on equity research and portfolio analysis. This experience has solidified my decision to pursue a career in investment banking.',
                        'status': 'approved',
                        'submittedAt': '2025-09-05',
                        'createdAt': datetime.now(timezone.utc),
                    },
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Neha Desai',
                        'email': 'neha.desai@dsvv.ac.in',
                        'rollNumber': 'DSV2022112',
                        'programme': 'M.A. Social Development',
                        'organization': 'Social Impact Initiative',
                        'mentor': 'Ms. Anjali Iyer',
                        'duration': '3 months (June-August 2025)',
                        'summary': 'Working with the social impact team was incredibly fulfilling. I contributed to projects that made a tangible difference in rural communities. Beyond professional skills, this internship deepened my commitment to social responsibility. Participated in community impact assessments and project evaluation.',
                        'status': 'approved',
                        'submittedAt': '2025-09-10',
                        'createdAt': datetime.now(timezone.utc),
                    },
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Vikram Sharma',
                        'email': 'vikram.sharma@dsvv.ac.in',
                        'rollNumber': 'DSV2022156',
                        'programme': 'B.Tech Information Technology',
                        'organization': 'Product Development Studio',
                        'mentor': 'Mr. Rajesh Kumar',
                        'duration': '2.5 months (June-August 2025)',
                        'summary': 'The product development internship exposed me to the entire product lifecycle. From ideation to launch, I was involved in cross-functional teams including design and engineering. Worked on mobile application development using React Native. The problem-solving skills and agile methodologies I learned are invaluable.',
                        'status': 'approved',
                        'submittedAt': '2025-09-15',
                        'createdAt': datetime.now(timezone.utc),
                    },
                    {
                        'formId': form_id,
                        'volumeId': '',
                        'studentName': 'Anjali Verma',
                        'email': 'anjali.verma@dsvv.ac.in',
                        'rollNumber': 'DSV2022198',
                        'programme': 'B.Sc Environmental Science',
                        'organization': 'Research Institute',
                        'mentor': 'Dr. Suresh Patel',
                        'duration': '4 months (May-August 2025)',
                        'summary': 'My research internship involved conducting literature reviews, data collection, and statistical analysis on climate change mitigation. Working closely with experienced researchers has inspired me to pursue further studies. Contributed to two published papers in environmental journals.',
                        'status': 'approved',
                        'submittedAt': '2025-09-20',
                        'createdAt': datetime.now(timezone.utc),
                    },
                ])
    except Exception as e:
        print(f'Seeding error: {e}')

def sign_token(user_id, email, name):
    """Generate JWT token."""
    payload = {
        'sub': str(user_id),
        'email': email,
        'name': name,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def sign_student_token(user_id, email, name):
    """Generate JWT token for a student account."""
    payload = {
        'sub': str(user_id),
        'email': email,
        'name': name,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_auth():
    """Verify JWT token from cookies."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user = admins.find_one({'_id': ObjectId(payload['sub'])})
        if not user:
            return None
        return {'id': str(user['_id']), 'name': user['name'], 'email': user['email']}
    except:
        return None

def verify_student_auth():
    """Verify student JWT token from cookies."""
    token = request.cookies.get(STUDENT_COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user = students.find_one({'_id': ObjectId(payload['sub'])})
        if not user:
            return None
        return {'id': str(user['_id']), 'name': user['name'], 'email': user['email']}
    except:
        return None

def require_auth(f):
    """Decorator for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = verify_auth()
        if not user:
            return jsonify({'message': 'Authentication required.'}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def serve_index():
    """Serve the public home page."""
    return render_template('home.html')

@app.route('/admin/verify')
def serve_admin_verify():
    """Serve admin verify page."""
    user = verify_auth()
    if not user:
        return redirect('/auth')
    return render_template('admin-verify.html', auth_role='admin')

@app.route('/admin/visitors')
def serve_admin_visitors():
    """Serve admin user logs page."""
    user = verify_auth()
    if not user:
        return redirect('/auth')
    return render_template('admin-visitors.html', auth_role='admin')

@app.route('/admin/logs')
def serve_admin_logs():
    """Serve admin visit logs page."""
    user = verify_auth()
    if not user:
        return redirect('/auth')
    return render_template('admin-logs.html', auth_role='admin')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    if path.startswith('api/'):
        return jsonify({'message': 'Not found'}), 404
    # If a corresponding template exists in the templates folder, render it
    template_path = os.path.join(app.template_folder or 'templates', path)
    if path.endswith('.html') and os.path.exists(template_path):
        # render the template (path is the filename under templates)
        return render_template(path)

    # Otherwise, serve as a static file from project root (styles, assets, js)
    return send_from_directory('.', path)

@app.route('/admin')
def serve_admin():
    """Serve admin dashboard page."""
    user = verify_auth()
    if not user:
        return redirect('/auth')
    return render_template('admin.html', auth_role='admin')

@app.route('/forms')
def serve_forms():
    """Serve forms page."""
    user = verify_student_auth() or verify_auth()
    role = 'admin' if verify_auth() else 'student' if verify_student_auth() else None
    return render_template('forms.html', auth_role=role)

@app.route('/auth')
def serve_auth():
    """Serve login/registration page."""
    return render_template('auth.html', auth_role=None, next_path=request.args.get('next', ''))

@app.route('/archive')
def serve_archive():
    """Serve archive page."""
    role = 'admin' if verify_auth() else 'student' if verify_student_auth() else None
    return render_template('archive.html', auth_role=role)


@app.route('/gallery')
def serve_gallery():
    """Serve photo gallery page."""
    role = 'admin' if verify_auth() else 'student' if verify_student_auth() else None
    return render_template('gallery.html', auth_role=role)


@app.route('/faqs')
def serve_faqs():
    """Serve FAQs page."""
    return render_template('faqs.html', auth_role=None)


@app.route('/guidelines')
def serve_guidelines():
    """Serve Guidelines page."""
    return render_template('guidelines.html', auth_role=None)

@app.route('/dashboard')
def serve_dashboard():
    """Serve student dashboard page."""
    user = verify_student_auth() or verify_auth()
    if not user:
        return redirect('/auth')
    role = 'admin' if verify_auth() else 'student' if verify_student_auth() else None
    return render_template('dashboard.html', auth_role=role, user=user)

@app.route('/api/bootstrap', methods=['GET'])
def bootstrap():
    """Get initial app state."""
    try:
        user = verify_auth() or verify_student_auth()
        role = 'admin' if verify_auth() else 'student' if verify_student_auth() else None
        forms_list = [to_client(f) for f in forms.find().sort('deadline', 1)]
        volumes_list = [to_client(v) for v in volumes.find().sort('publishedAt', 1)]
        # Only expose approved submissions to public bootstrap
        submissions_list = [to_client(s) for s in submissions.find({'status': 'approved'}).sort('submittedAt', -1)]

        # Find latest approved submission that has an uploaded photo/avatar
        photo_query = {
            'status': 'approved',
            '$or': [
                {'avatarUrl': {'$exists': True, '$ne': ''}},
                {'photo': {'$exists': True, '$ne': ''}},
                {'thumbnail': {'$exists': True, '$ne': ''}},
            ]
        }
        # Prefer the newest approved submission that actually has a reachable photo file.
        latest_photo = None
        try:
            from urllib.parse import unquote
            cursor = submissions.find(photo_query).sort([('verifiedAt', -1), ('submittedAt', -1)])
            for p in cursor:
                # pick the first candidate whose image is likely available
                url = p.get('avatarUrl') or p.get('photo') or p.get('thumbnail') or ''
                if not url:
                    continue
                url = str(url)
                # accept external/data/blob URLs immediately
                if url.startswith('http') or url.startswith('data:') or url.startswith('blob:'):
                    latest_photo = to_client(p)
                    break

                # normalize to filename when served from our uploads API
                filename = url
                if filename.startswith('/api/uploads/avatars/'):
                    filename = filename.split('/api/uploads/avatars/')[-1]

                # undo percent-encoding if present
                filename = unquote(filename)

                # check across candidate upload directories
                found = False
                for uploads_dir in _avatar_storage_candidates():
                    file_path = os.path.join(uploads_dir, secure_filename(filename))
                    if os.path.exists(file_path):
                        found = True
                        break

                if found:
                    latest_photo = to_client(p)
                    break
        except Exception:
            # on unexpected errors, fall back to previous behaviour
            latest_photo_doc = submissions.find(photo_query).sort([('verifiedAt', -1), ('submittedAt', -1)]).limit(1)
            for p in latest_photo_doc:
                latest_photo = to_client(p)
        # Find featured submission (admin-marked)
        featured_doc = submissions.find_one({'isFeatured': True})
        featured_submission = to_client(featured_doc) if featured_doc else None
        total_visitors = visitors.count_documents({})
        unique_visitors = len(visitors.distinct('visitorId'))
        approved_submissions_count = submissions.count_documents({'status': 'approved'})
        organization_count = len(submissions.distinct('organization', {'status': 'approved'}))
        student_count = students.count_documents({})
        volume_count = volumes.count_documents({})
        
        return jsonify({
            'user': user,
            'role': role,
            'forms': forms_list,
            'volumes': volumes_list,
            'submissions': submissions_list,
            'latestApprovedWithPhoto': latest_photo,
            'featuredSubmission': featured_submission,
            'totalVisitors': total_visitors,
            'stats': {
                'approvedSubmissions': approved_submissions_count,
                'organizationsFeatured': organization_count,
                'registeredStudents': student_count,
                'archiveVolumes': volume_count,
                'siteVisitors': unique_visitors,
            },
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Get current auth status."""
    admin_user = verify_auth()
    if admin_user:
        return jsonify({'user': admin_user, 'role': 'admin'})

    student_user = verify_student_auth()
    if student_user:
        return jsonify({'user': student_user, 'role': 'student'})

    return jsonify({'user': None, 'role': None})

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login an admin or student account."""
    try:
        data = get_request_data()
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'message': 'Email and password required.'}), 400
        
        admin_user = admins.find_one({'email': email})
        if admin_user and bcrypt.checkpw(password.encode(), admin_user['passwordHash'].encode()):
            token = sign_token(admin_user['_id'], admin_user['email'], admin_user['name'])
            response = jsonify({'user': {'id': str(admin_user['_id']), 'email': admin_user['email'], 'name': admin_user['name']}, 'role': 'admin'})
            response.set_cookie(
                COOKIE_NAME,
                token,
                httponly=True,
                secure=IS_PRODUCTION,
                samesite='Lax',
                max_age=7 * 24 * 60 * 60,
            )
            response.delete_cookie(STUDENT_COOKIE_NAME, samesite='Lax')
            return response

        student_user = students.find_one({'email': email})
        if student_user and bcrypt.checkpw(password.encode(), student_user['passwordHash'].encode()):
            students.update_one({'_id': student_user['_id']}, {'$set': {'lastLoginAt': datetime.now(timezone.utc)}})
            token = sign_student_token(student_user['_id'], student_user['email'], student_user['name'])
            response = jsonify({'user': {'id': str(student_user['_id']), 'email': student_user['email'], 'name': student_user['name']}, 'role': 'student'})
            response.set_cookie(
                STUDENT_COOKIE_NAME,
                token,
                httponly=True,
                secure=IS_PRODUCTION,
                samesite='Lax',
                max_age=7 * 24 * 60 * 60,
            )
            response.delete_cookie(COOKIE_NAME, samesite='Lax')

            student_activity.insert_one({
                'studentId': student_user['_id'],
                'name': student_user['name'],
                'email': student_user['email'],
                'eventType': 'login',
                'createdAt': datetime.now(timezone.utc),
            })
            return response

        return jsonify({'message': 'Invalid login credentials.'}), 401
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Logout any signed-in account."""
    response = jsonify({'ok': True})
    response.delete_cookie(COOKIE_NAME, samesite='Lax')
    response.delete_cookie(STUDENT_COOKIE_NAME, samesite='Lax')
    return response


@app.route('/logout', methods=['POST'])
def web_logout():
    """Web-friendly logout endpoint used by templates; clears cookies and redirects home."""
    response = redirect('/')
    response.delete_cookie(COOKIE_NAME, samesite='Lax')
    response.delete_cookie(STUDENT_COOKIE_NAME, samesite='Lax')
    return response

@app.route('/api/students/me', methods=['GET'])
def student_me():
    """Get current student auth status."""
    user = verify_student_auth()
    return jsonify({'user': user})

@app.route('/api/students/register', methods=['POST'])
def student_register():
    """Register a student account."""
    try:
        data = get_request_data()
        name = str(data.get('name', '')).strip()
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')

        if not name or not email or not password:
            return jsonify({'message': 'Name, email, and password are required.'}), 400

        if students.find_one({'email': email}):
            return jsonify({'message': 'An account with this email already exists.'}), 409

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        doc = {
            'name': name,
            'email': email,
            'passwordHash': password_hash,
            'createdAt': datetime.now(timezone.utc),
            'lastLoginAt': datetime.now(timezone.utc),
        }
        result = students.insert_one(doc)
        doc['_id'] = result.inserted_id

        student_activity.insert_one({
            'studentId': doc['_id'],
            'name': doc['name'],
            'email': doc['email'],
            'eventType': 'register',
            'createdAt': datetime.now(timezone.utc),
        })

        return jsonify({'user': {'id': str(doc['_id']), 'email': doc['email'], 'name': doc['name']}, 'message': 'Registration complete. Please log in.'}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/students/login', methods=['POST'])
def student_login():
    """Login a student account."""
    try:
        data = get_request_data()
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'message': 'Email and password required.'}), 400

        user = students.find_one({'email': email})
        if not user or not bcrypt.checkpw(password.encode(), user['passwordHash'].encode()):
            return jsonify({'message': 'Invalid student credentials.'}), 401

        students.update_one({'_id': user['_id']}, {'$set': {'lastLoginAt': datetime.now(timezone.utc)}})
        token = sign_student_token(user['_id'], user['email'], user['name'])
        response = jsonify({'user': {'id': str(user['_id']), 'email': user['email'], 'name': user['name']}})
        response.set_cookie(
            STUDENT_COOKIE_NAME,
            token,
            httponly=True,
            secure=IS_PRODUCTION,
            samesite='Lax',
            max_age=7 * 24 * 60 * 60,
        )

        student_activity.insert_one({
            'studentId': user['_id'],
            'name': user['name'],
            'email': user['email'],
            'eventType': 'login',
            'createdAt': datetime.now(timezone.utc),
        })

        return response
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/students/logout', methods=['POST'])
def student_logout():
    """Logout a student account."""
    response = jsonify({'ok': True})
    response.delete_cookie(STUDENT_COOKIE_NAME, samesite='Lax')
    return response

@app.route('/api/students/activity', methods=['GET'])
@require_auth
def admin_student_activity():
    """Get student registration and login history for admin review."""
    try:
        recent_events = list(student_activity.find().sort('createdAt', -1).limit(50))
        accounts = list(students.find().sort('createdAt', -1))
        return jsonify({
            'accounts': [
                {
                    'id': str(account['_id']),
                    'name': account.get('name', ''),
                    'email': account.get('email', ''),
                    'createdAt': account.get('createdAt').isoformat() if account.get('createdAt') else '',
                    'lastLoginAt': account.get('lastLoginAt').isoformat() if account.get('lastLoginAt') else '',
                }
                for account in accounts
            ],
            'events': [
                {
                    'id': str(event['_id']),
                    'studentId': str(event.get('studentId', '')),
                    'name': event.get('name', ''),
                    'email': event.get('email', ''),
                    'eventType': event.get('eventType', ''),
                    'createdAt': event.get('createdAt').isoformat() if event.get('createdAt') else '',
                }
                for event in recent_events
            ],
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/visitors/track', methods=['POST'])
def track_visitor():
    """Track site visitor."""
    try:
        data = get_request_data()
        visitor_id = request.headers.get('X-Visitor-Id')
        if not visitor_id:
            return jsonify({'message': 'Visitor ID required'}), 400
        
        visitors.insert_one({
            'visitorId': visitor_id,
            'page': data.get('page', 'home'),
            'formId': data.get('formId', ''),
            'referrer': data.get('referrer', ''),
            'userAgent': data.get('userAgent', ''),
            'ipAddress': request.remote_addr,
            'createdAt': datetime.now(timezone.utc),
        })
        
        return jsonify({'visitorId': visitor_id})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/analytics/visitors', methods=['GET'])
@require_auth
def analytics_visitors():
    """Get visitor analytics."""
    try:
        # Total Visitors (unique)
        unique_visitors = len(visitors.distinct('visitorId'))
        
        # Total Pageviews
        total_pageviews = visitors.count_documents({})
        
        # Engaged Users: visitors with more than 1 page view
        visitor_page_counts = list(visitors.aggregate([
            {'$group': {'_id': '$visitorId', 'pageViews': {'$sum': 1}}},
        ]))
        engaged_users = sum(1 for v in visitor_page_counts if v['pageViews'] > 1)
        
        # Bounce Rate: percentage of single-page visits
        total_sessions = len(visitor_page_counts)
        bounced_sessions = sum(1 for v in visitor_page_counts if v['pageViews'] == 1)
        bounce_rate = (bounced_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # Engagement Rate: opposite of bounce rate
        engagement_rate = 100 - bounce_rate
        
        # Conversion Rate: visitors who submitted forms
        visitors_with_forms = len(visitors.distinct('visitorId', {'formId': {'$ne': ''}}))
        conversion_rate = (visitors_with_forms / unique_visitors * 100) if unique_visitors > 0 else 0
        
        # Traffic by Source: group by referrer
        traffic_by_source = list(visitors.aggregate([
            {'$match': {'referrer': {'$ne': ''}}},
            {'$group': {'_id': '$referrer', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 10}
        ]))
        
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        daily = list(visitors.aggregate([
            {'$match': {'createdAt': {'$gte': seven_days_ago}}},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}},
                'count': {'$sum': 1},
            }},
            {'$sort': {'_id': 1}},
        ]))
        
        return jsonify({
            'totalVisitors': unique_visitors,
            'activeEngagedUsers': engaged_users,
            'bounceRate': round(bounce_rate, 2),
            'engagementRate': round(engagement_rate, 2),
            'pageviews': total_pageviews,
            'conversionRate': round(conversion_rate, 2),
            'totalTraffic': unique_visitors,  # Same as total visitors
            'trafficBySource': traffic_by_source,
            'dailyVisitors': daily
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/analytics/submissions', methods=['GET'])
@require_auth
def analytics_submissions():
    """Get submission analytics."""
    try:
        forms_list = list(forms.find())
        submission_stats = list(submissions.aggregate([
            {'$group': {'_id': '$formId', 'count': {'$sum': 1}}},
        ]))
        
        data = []
        for form in forms_list:
            stats = next((s for s in submission_stats if s['_id'] == form['_id']), None)
            data.append({
                'formId': str(form['_id']),
                'title': form['title'],
                'count': stats['count'] if stats else 0,
            })
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms', methods=['GET'])
def get_forms():
    """Get all active forms (public endpoint for viewing)."""
    try:
        forms_list = [to_client(f) for f in forms.find({'status': 'active'}).sort('deadline', 1)]
        for form in forms_list:
            form['submissionCount'] = max(0, int(form.get('submissionCount', 0) or 0))
        return jsonify(forms_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms', methods=['POST'])
@require_auth
def create_form():
    """Create form."""
    try:
        data = get_request_data()
        if not all(k in data for k in ['title', 'category', 'deadline', 'description']):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        doc = {
            'title': data['title'],
            'category': data['category'],
            'deadline': data['deadline'],
            'description': data['description'],
            'volumeId': data.get('volumeId', ''),
            'status': data.get('status', 'active'),
            'submissionCount': 0,
            'createdAt': datetime.now(timezone.utc),
        }
        result = forms.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms/<form_id>', methods=['PUT'])
@require_auth
def update_form(form_id):
    """Update form."""
    try:
        data = get_request_data()
        result = forms.update_one(
            {'_id': ObjectId(form_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Form not found.'}), 404
        updated = forms.find_one({'_id': ObjectId(form_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/forms/<form_id>', methods=['DELETE'])
@require_auth
def delete_form(form_id):
    """Delete form and linked submissions."""
    try:
        submissions.delete_many({'formId': ObjectId(form_id)})
        result = forms.delete_one({'_id': ObjectId(form_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Form not found.'}), 404
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/forms', methods=['GET'])
@require_auth
def get_admin_forms():
    """Get all forms (admin only) - includes inactive forms."""
    try:
        forms_list = [to_client(f) for f in forms.find().sort('deadline', 1)]
        for form in forms_list:
            form['submissionCount'] = max(0, int(form.get('submissionCount', 0) or 0))
        return jsonify(forms_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes', methods=['GET'])
@require_auth
def get_volumes():
    """Get all volumes."""
    try:
        volumes_list = [to_client(v) for v in volumes.find().sort('publishedAt', -1)]
        return jsonify(volumes_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes', methods=['POST'])
@require_auth
def create_volume():
    """Create volume."""
    try:
        data = get_request_data()
        if not all(k in data for k in ['volumeLabel', 'year', 'publishedAt', 'description']):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        doc = {
            'volumeLabel': data['volumeLabel'],
            'year': data['year'],
            'publishedAt': data['publishedAt'],
            'description': data['description'],
            'items': data.get('items', 0),
            'createdAt': datetime.now(timezone.utc),
        }
        result = volumes.insert_one(doc)
        doc['_id'] = result.inserted_id
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes/<volume_id>', methods=['PUT'])
@require_auth
def update_volume(volume_id):
    """Update volume."""
    try:
        data = get_request_data()
        result = volumes.update_one(
            {'_id': ObjectId(volume_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Volume not found.'}), 404
        updated = volumes.find_one({'_id': ObjectId(volume_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/volumes/<volume_id>', methods=['DELETE'])
@require_auth
def delete_volume(volume_id):
    """Delete volume."""
    try:
        result = volumes.delete_one({'_id': ObjectId(volume_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Volume not found.'}), 404
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    """Get submissions, or approved public testimonials for the home page."""
    try:
        approved_only = str(request.args.get('approved', '')).lower() in ('1', 'true', 'yes')
        if approved_only:
            user = verify_auth() or verify_student_auth()
            submissions_list = []
            for submission in submissions.find({'status': 'approved'}).sort('submittedAt', -1):
                doc = to_client(submission)
                summary = str(doc.get('summary', ''))
                doc['summaryPreview'] = summary[:180].rstrip()
                if len(summary) > 180:
                    doc['summaryPreview'] += '...'
                if not user:
                    doc.pop('summary', None)
                submissions_list.append(doc)
            return jsonify(submissions_list)

        user = verify_auth()
        if not user:
            return jsonify({'message': 'Authentication required.'}), 401

        submissions_list = [to_client(s) for s in submissions.find().sort('submittedAt', -1)]
        submitted_by = request.args.get('submittedBy')
        if submitted_by:
            submissions_list = [s for s in submissions_list if str(s.get('email', '')).lower() == submitted_by.lower()]
        return jsonify(submissions_list)
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/archives', methods=['GET'])
def get_archives():
    """Return approved submissions grouped by year as archive volumes."""
    try:
        user = verify_auth() or verify_student_auth()
        docs = list(submissions.find({'status': 'approved'}).sort('submittedAt', -1))

        groups = {}
        for s in docs:
            doc = to_client(s)
            # create preview
            summary = str(doc.get('summary', '') or '')
            doc['summaryPreview'] = summary[:180].rstrip() + ('...' if len(summary) > 180 else '') if summary else ''
            # hide full summary for unauthenticated users
            if not user:
                doc.pop('summary', None)

            dateStr = doc.get('submittedAt') or doc.get('createdAt') or ''
            year = 'Unknown'
            if isinstance(dateStr, str) and len(dateStr) >= 4 and dateStr[:4].isdigit():
                year = dateStr[:4]
            elif isinstance(doc.get('year'), (str, int)):
                year = str(doc.get('year'))

            if year not in groups:
                groups[year] = []
            groups[year].append(doc)

        volumes = []
        for year, items in groups.items():
            latest = None
            for it in items:
                d = it.get('submittedAt') or it.get('createdAt') or ''
                if isinstance(d, str) and len(d) >= 4 and d[:4].isdigit():
                    try:
                        cand = datetime.fromisoformat(d)
                    except Exception:
                        cand = None
                else:
                    cand = None
                if cand and (not latest or cand > latest):
                    latest = cand

            volumes.append({
                'id': f'vol-{year}',
                'volumeLabel': f'Volume {year}',
                'year': year,
                'publishedAt': latest.isoformat() if latest else '',
                'description': f'Published collection of {len(items)} approved experiences from {year}.',
                'items': len(items),
                'submissions': items,
            })

        # sort descending by year when numeric
        def year_key(v):
            try:
                return int(v['year'])
            except Exception:
                return 0

        volumes = sorted(volumes, key=year_key, reverse=True)
        return jsonify(volumes)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions', methods=['POST'])
def create_submission():
    """Create submission."""
    try:
        data = get_request_data()
        required = ['formId', 'studentName', 'email', 'rollNumber', 'programme', 'organization', 'mentor', 'duration', 'summary']
        if not all(k in data for k in required):
            return jsonify({'message': 'Missing required fields.'}), 400
        
        try:
            form = forms.find_one({'_id': ObjectId(data['formId'])})
        except:
            return jsonify({'message': 'Invalid form ID.'}), 400
            
        if not form:
            return jsonify({'message': 'Form not found.'}), 404
        if form.get('status') != 'active':
            return jsonify({'message': 'Form is not active.'}), 400
        
        # Check deadline - compare as strings
        form_deadline = str(form.get('deadline', '')).split('T')[0]
        current_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        if form_deadline < current_date:
            return jsonify({'message': 'Submission deadline has passed.'}), 400
        
        # Handle uploaded photo/avatar (optional)
        avatar_url = None
        if 'photo' in request.files:
            photo = request.files.get('photo')
            if photo and photo.filename:
                avatar_url = save_avatar_file(photo)

        # Handle optional gallery images (up to 5)
        gallery_urls = []
        if 'gallery' in request.files:
            gallery_files = request.files.getlist('gallery')
            for gfile in gallery_files[:5]:  # limit to 5
                if gfile and gfile.filename:
                    url = save_avatar_file(gfile)
                    if url:
                        gallery_urls.append(url)

        # Mark new submissions as pending verification
        doc = {
            'formId': ObjectId(data['formId']),
            'volumeId': data.get('volumeId', ''),
            'studentName': data['studentName'],
            'email': data.get('email', ''),
            'rollNumber': data['rollNumber'],
            'programme': data['programme'],
            'organization': data['organization'],
            'mentor': data['mentor'],
            'duration': data['duration'],
            'summary': data['summary'],
            'submittedAt': data.get('submittedAt', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
            'createdAt': datetime.now(timezone.utc),
            'status': 'pending',
            'statusReason': '',
        }
        if avatar_url:
            doc['avatarUrl'] = avatar_url
        if gallery_urls:
            doc['gallery'] = gallery_urls
        result = submissions.insert_one(doc)
        forms.update_one(
            {'_id': ObjectId(data['formId'])},
            [{
                '$set': {
                    'submissionCount': {
                        '$add': [
                            {'$max': [0, {'$ifNull': ['$submissionCount', 0]}]},
                            1
                        ]
                    }
                }
            }]
        )
        doc['_id'] = result.inserted_id
        # Log form submission activity (no credentials)
        student_activity.insert_one({
            'studentId': None,
            'name': doc.get('studentName'),
            'email': doc.get('email', ''),
            'eventType': 'form_submit',
            'formId': ObjectId(data['formId']),
            'submissionId': doc['_id'],
            'createdAt': datetime.now(timezone.utc),
            'ipAddress': request.remote_addr,
        })
        return jsonify(to_client(doc)), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>', methods=['PUT'])
@require_auth
def update_submission(submission_id):
    """Update submission."""
    try:
        data = get_request_data()
        result = submissions.update_one(
            {'_id': ObjectId(submission_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'message': 'Submission not found.'}), 404
        updated = submissions.find_one({'_id': ObjectId(submission_id)})
        return jsonify(to_client(updated))
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/submissions/<submission_id>/verify', methods=['POST'])
@require_auth
def verify_submission(submission_id):
    """Approve or reject a submission (admin only)."""
    try:
        data = get_request_data()
        status = data.get('status')
        reason = data.get('reason', '')

        if status not in ('approved', 'rejected'):
            return jsonify({'message': 'Invalid status.'}), 400

        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404

        current_status = str(sub.get('status', '')).lower()
        # Rejected submissions are terminal and cannot be approved again.
        if current_status == 'rejected' and status == 'approved':
            return jsonify({'message': 'Rejected submissions cannot be approved again.'}), 409
        # Approved submissions are terminal and cannot be rejected again.
        if current_status == 'approved' and status == 'rejected':
            return jsonify({'message': 'Approved submissions cannot be rejected again.'}), 409

        result = submissions.update_one(
            {'_id': ObjectId(submission_id)},
            {'$set': {'status': status, 'statusReason': reason, 'verifiedAt': datetime.now(timezone.utc), 'verifiedBy': request.user['id']}}
        )

        if result.matched_count == 0:
            return jsonify({'message': 'Submission not found.'}), 404

        # If approved, increment forms submissionCount remains as-is (already incremented on create)
        # Record admin action in student_activity for audit
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        student_activity.insert_one({
            'studentId': sub.get('studentId'),
            'name': sub.get('studentName'),
            'email': sub.get('email', ''),
            'eventType': f'submission_{status}',
            'submissionId': sub['_id'],
            'createdAt': datetime.now(timezone.utc),
            'adminId': request.user['id'],
        })

        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/submissions/<submission_id>/avatar', methods=['POST'])
@require_auth
def upload_submission_avatar(submission_id):
    """Admin: upload or replace avatar image for a submission."""
    try:
        # Ensure submission exists
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404

        if 'photo' not in request.files:
            return jsonify({'message': 'No file uploaded.'}), 400

        photo = request.files.get('photo')
        if not photo or not photo.filename:
            return jsonify({'message': 'Invalid file.'}), 400

        avatar_url = save_avatar_file(photo)

        submissions.update_one({'_id': ObjectId(submission_id)}, {'$set': {'avatarUrl': avatar_url}})
        return jsonify({'ok': True, 'avatarUrl': avatar_url})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/submissions/<submission_id>/gallery', methods=['POST'])
@require_auth
def upload_submission_gallery(submission_id):
    """Admin: upload additional gallery images for a submission."""
    try:
        # Ensure submission exists
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404

        if 'photos' not in request.files:
            return jsonify({'message': 'No files uploaded.'}), 400

        photos = request.files.getlist('photos')
        if not photos or all(not p.filename for p in photos):
            return jsonify({'message': 'Invalid files.'}), 400

        gallery_urls = []
        for photo in photos:
            if photo and photo.filename:
                url = save_avatar_file(photo)
                if url:
                    gallery_urls.append(url)

        if gallery_urls:
            # append to existing gallery
            existing = sub.get('gallery', []) or []
            updated_gallery = existing + gallery_urls
            submissions.update_one({'_id': ObjectId(submission_id)}, {'$set': {'gallery': updated_gallery}})

        return jsonify({'ok': True, 'gallery': gallery_urls})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/submissions/<submission_id>/feature', methods=['POST'])
@require_auth
def feature_submission(submission_id):
    """Mark a submission as featured (only one featured at a time)."""
    try:
        # Ensure submission exists
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404

        # Unset previous featured
        submissions.update_many({'isFeatured': True}, {'$set': {'isFeatured': False}})
        # Set this one as featured
        submissions.update_one({'_id': ObjectId(submission_id)}, {'$set': {'isFeatured': True}})
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/visit-logs', methods=['GET'])
@require_auth
def get_visit_logs():
    """Return visitor page logs for admin review (no credentials)."""
    try:
        visits = list(visitors.find().sort('createdAt', -1).limit(1000))

        logs = [
            {
                'timestamp': v.get('createdAt').isoformat() if v.get('createdAt') else '',
                'userEmail': v.get('email', '') or '',
                'action': 'page_visit',
                'page': v.get('page', ''),
                'ipAddress': v.get('ipAddress', '') or '',
            }
            for v in visits
        ]

        # sort by timestamp desc
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(logs)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>', methods=['DELETE'])
@require_auth
def delete_submission(submission_id):
    """Delete submission."""
    try:
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404
        submissions.delete_one({'_id': ObjectId(submission_id)})
        forms.update_one(
            {'_id': sub['formId']},
            [{
                '$set': {
                    'submissionCount': {
                        '$max': [
                            0,
                            {
                                '$subtract': [
                                    {'$ifNull': ['$submissionCount', 0]},
                                    1
                                ]
                            }
                        ]
                    }
                }
            }]
        )
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/submissions/<submission_id>/pdf', methods=['GET'])
def download_pdf(submission_id):
    """Generate and download submission PDF."""
    try:
        sub = submissions.find_one({'_id': ObjectId(submission_id)})
        if not sub:
            return jsonify({'message': 'Submission not found.'}), 404
        
        form = forms.find_one({'_id': sub['formId']})
        volume = volumes.find_one({'_id': ObjectId(sub['volumeId'])}) if sub.get('volumeId') else None
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#0d5c46'), spaceAfter=6)
        story.append(Paragraph('Anubhuti', title_style))
        subtitle_style = ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#66706a'))
        story.append(Paragraph('Dev Sanskriti Vishwavidyalaya internship submission export', subtitle_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Student info
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=18, textColor=colors.HexColor('#12241e'), spaceAfter=10)
        story.append(Paragraph(sub['studentName'], heading_style))
        
        info_data = [
            ['Roll number:', sub['rollNumber']],
            ['Programme:', sub['programme']],
            ['Organization:', sub['organization']],
            ['Mentor:', sub['mentor']],
            ['Duration:', sub['duration']],
            ['Submitted on:', sub['submittedAt']],
            ['Form:', form['title'] if form else 'Unknown'],
            ['Archive volume:', volume['volumeLabel'] if volume else 'Unassigned'],
        ]
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#12241e')),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        summary_heading = ParagraphStyle('SummaryHeading', parent=styles['Heading3'], fontSize=13, textColor=colors.HexColor('#12241e'), spaceAfter=8)
        story.append(Paragraph('Experience summary', summary_heading))
        summary_style = ParagraphStyle('SummaryText', parent=styles['Normal'], fontSize=10, leading=14, alignment=0)
        story.append(Paragraph(sub['summary'], summary_style))
        
        doc.build(story)
        buffer.seek(0)
        
        filename = f"anubhuti-{sub['rollNumber']}.pdf".replace('/', '-')
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'message': str(e)}), 500

if __name__ == '__main__':
    seed_database()
    app.run(host='0.0.0.0', port=PORT, debug=False)
