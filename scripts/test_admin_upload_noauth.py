import requests

# get a public form id
forms = requests.get('http://127.0.0.1:3000/api/forms').json()
if not forms:
    print('No public forms found')
    raise SystemExit(1)
form_id = forms[0].get('_id') or forms[0].get('id')
print('Using form id:', form_id)

url = f'http://127.0.0.1:3000/api/admin/forms/{form_id}/upload-pdf'
files = {'pdf': ('test_student.pdf', open('scripts/test_student.pdf','rb'), 'application/pdf')}
print('POSTing to', url)
r = requests.post(url, files=files, timeout=10)
print('STATUS', r.status_code)
try:
    print('JSON', r.json())
except Exception:
    print('TEXT', r.text[:1000])
