import sys, json, requests
sys.path.append('.')
from app import sign_token, admins, COOKIE_NAME

admin = admins.find_one({})
if not admin:
    print('No admin user found in DB')
    raise SystemExit(1)

token = sign_token(admin['_id'], admin['email'], admin['name'])
print('Using admin:', admin.get('email'))

s = requests.Session()
s.cookies.set(COOKIE_NAME, token, domain='127.0.0.1')

# get admin forms
r = s.get('http://127.0.0.1:3000/api/admin/forms')
print('GET /api/admin/forms', r.status_code)
try:
    forms = r.json()
except Exception:
    print('Failed to parse forms response', r.text[:1000])
    raise SystemExit(1)
if not forms:
    print('No forms')
    raise SystemExit(1)
form_id = forms[0].get('_id') or forms[0].get('id')
print('Using form id:', form_id)

url = f'http://127.0.0.1:3000/api/admin/forms/{form_id}/upload-pdf'
files = {'pdf': ('test_student.pdf', open('scripts/test_student.pdf','rb'), 'application/pdf')}
print('POSTing to', url)
r = s.post(url, files=files, timeout=30)
print('STATUS', r.status_code)
try:
    print(json.dumps(r.json(), indent=2))
except Exception:
    print('TEXT', r.text[:2000])
