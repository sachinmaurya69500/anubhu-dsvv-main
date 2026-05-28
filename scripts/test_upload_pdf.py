from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import requests
import time

pdf_path = 'scripts/test_student.pdf'
# Create test PDF
c = canvas.Canvas(pdf_path, pagesize=letter)
c.setFont('Helvetica', 12)
c.drawString(72, 720, 'Student Name: John Doe')
c.drawString(72, 700, 'Email: john.doe@example.com')
c.drawString(72, 680, 'Roll Number: 123456')
c.drawString(72, 660, 'Programme: B.Sc Physics')
c.drawString(72, 640, 'Organization: DSVV Research Center')
c.drawString(72, 620, 'Mentor: Dr. Smith')
c.drawString(72, 600, 'Duration: 6 weeks')
summary = 'Summary: This internship involved field work and data collection on environmental parameters. Learnt sampling, analysis, and report writing.'
text_obj = c.beginText(72, 580)
for line in summary.split('. '):
    text_obj.textLine(line.strip())
c.drawText(text_obj)
c.showPage()
c.save()

# Post to debug endpoint
url = 'http://127.0.0.1:5000/api/debug/parse-pdf'
files = {'pdf': open(pdf_path, 'rb')}
print('Posting', pdf_path, 'to', url)
try:
    r = requests.post(url, files=files, timeout=10)
    print('Status:', r.status_code)
    try:
        print('Response JSON:', r.json())
    except Exception:
        print('Response text:', r.text)
except Exception as e:
    print('Request failed:', e)
    
# sleep a bit to allow reading output
time.sleep(0.2)
