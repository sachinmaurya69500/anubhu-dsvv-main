from app import app
for r in app.url_map.iter_rules():
    if 'debug' in r.rule:
        print(r.rule, sorted(list(r.methods)))
