import fitz, re, json

pdf_path = 'scripts/test_student.pdf'

with open(pdf_path, 'rb') as f:
    data = f.read()

try:
    doc = fitz.open(stream=data, filetype='pdf')
except Exception as e:
    print('Could not open PDF:', e)
    raise SystemExit(1)

full_text = []
for page in doc:
    full_text.append(page.get_text('text'))
doc.close()
text = '\n'.join(full_text)

# parse entries
parts = re.split(r"\n-{3,}\n|\nStudent Name:|\nName:\\s", text, flags=re.IGNORECASE)
parts = [p.strip() for p in parts if p and p.strip()]
if not parts:
    parts = [text]

def extract(block):
    get = lambda patterns: next((m.group(1).strip() for pat in patterns for m in [re.search(pat, block, re.IGNORECASE | re.DOTALL)] if m and m.group(1).strip()), '')
    studentName = get([r"Student Name[:\-]\s*(.+?)\n", r"Name[:\-]\s*(.+?)\n"]) or get([r"^([A-Z][A-Za-z .,'-]{2,})\\n"]) or ''
    email = get([r"Email[:\-]\s*(\S+@\S+)\b"]) or ''
    roll = get([r"Roll(?:\s*No(?:\.|)| Number)?[:\-]\s*(.+?)\n", r"Roll[:\-]\s*(.+?)\n"]) or ''
    programme = get([r"Programme[:\-]\s*(.+?)\n", r"Program[:\-]\s*(.+?)\n"]) or ''
    organization = get([r"Organization[:\-]\s*(.+?)\n", r"Place of Internship[:\-]\s*(.+?)\n"]) or ''
    mentor = get([r"Mentor[:\-]\s*(.+?)\n", r"Supervisor[:\-]\s*(.+?)\n"]) or ''
    duration = get([r"Duration[:\-]\s*(.+?)\n"]) or ''
    summary = ''
    m = re.search(r"Summary[:\-]\s*(.+)$", block, re.IGNORECASE | re.DOTALL)
    if m:
        summary = m.group(1).strip()
    else:
        summary = block.strip()[:2000]
    return {
        'studentName': studentName,
        'email': email,
        'rollNumber': roll,
        'programme': programme,
        'organization': organization,
        'mentor': mentor,
        'duration': duration,
        'summary': summary,
    }

parsed = [extract(p) for p in parts]
print(json.dumps({'parts_count': len(parts), 'parsed': parsed}, indent=2))
