import requests

pdf_path = 'scripts/test_student.pdf'
url = 'http://127.0.0.1:3000/api/debug/parse-pdf'
files = {'pdf': open(pdf_path, 'rb')}
print('Posting', pdf_path, 'to', url)
try:
    r = requests.post(url, files=files, timeout=30)
    print('Status:', r.status_code)
    try:
        print('Response JSON:', r.json())
    except Exception:
        print('Response text:', r.text)
except Exception as e:
    print('Request failed:', e)
