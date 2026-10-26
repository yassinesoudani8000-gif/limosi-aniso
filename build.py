#!/usr/bin/env python3
import base64, os, glob

IMG_DIR = "/home/user/limosi-aniso/image-search"
TPL = "/home/user/limosi-aniso/template.html"
OUT = "/home/user/limosi-aniso/index.html"

MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}

files = sorted(glob.glob(os.path.join(IMG_DIR, "*")))
uris = []
for f in files:
    ext = os.path.splitext(f)[1].lower()
    mime = MIME.get(ext, "image/jpeg")
    with open(f, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")
    uris.append('"data:%s;base64,%s"' % (mime, b64))

embedded = "[\n  " + ",\n  ".join(uris) + "\n]"

with open(TPL, "r", encoding="utf-8") as fh:
    html = fh.read()

if "__EMBEDDED__" not in html:
    raise SystemExit("placeholder __EMBEDDED__ not found in template")

html = html.replace("__EMBEDDED__", embedded)

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(html)

print("images embedded:", len(uris))
print("index.html size:", os.path.getsize(OUT), "bytes (%.2f MB)" % (os.path.getsize(OUT)/1e6))
