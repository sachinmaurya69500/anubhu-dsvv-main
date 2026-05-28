import sys
sys.path.append('.')
from app import app
from io import BytesIO
c = app.test_client()
# simple POST without files
r = c.post('/api/debug/echo-post', data={'a':'b'})
print('STATUS', r.status_code)
print('DATA', r.get_data(as_text=True)[:1000])
# multipart file POST
data = {'pdf': (BytesIO(b'%PDF-1.4\n% fake pdf'), 'sample.pdf')}
r2 = c.post('/api/debug/echo-post', data=data, content_type='multipart/form-data')
print('STATUS2', r2.status_code)
print('DATA2', r2.get_data(as_text=True)[:1000])
