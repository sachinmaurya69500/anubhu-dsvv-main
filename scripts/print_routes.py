from app import app
for r in sorted(app.url_map.iter_rules(), key=lambda x: x.rule):
    print(r.rule, sorted(list(r.methods)))
