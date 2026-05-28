import requests
url = 'http://127.0.0.1:3000/api/debug/echo-post'
files = {'pdf': ('test_student.pdf', open('scripts/test_student.pdf','rb'), 'application/pdf')}
try:
    r = requests.post(url, files=files, timeout=10)
    print('STATUS', r.status_code)
    print('HEADERS', r.headers.get('Content-Type'))
    try:
        print('JSON', r.json())
    except Exception:
        print('TEXT', r.text[:1000])
except Exception as e:
    print('ERROR', e)
