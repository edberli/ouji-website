#!/usr/bin/env python3
"""Update only ?v=... cache keys of local CSS/JS references in selected HTML pages."""
import argparse,re
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('version');p.add_argument('pages',nargs='*',type=Path);p.add_argument('--write',action='store_true');args=p.parse_args()
if not re.fullmatch(r'[A-Za-z0-9._-]+',args.version):p.error('invalid version')
pattern=re.compile(r'((?:href|src)=["\'](?!https?://|//)[^"\']+\.(?:css|js)\?v=)[^"\']+')
root=Path(__file__).resolve().parents[1]
pages=args.pages or [page for page in root.rglob('*.html') if not any(part in ('node_modules','.git') for part in page.parts)]
for path in pages:
    old=path.read_text();new,n=pattern.subn(lambda m:m.group(1)+args.version,old)
    if args.write and n:path.write_text(new)
    print(f'{path}: {n} reference(s) '+('updated' if args.write else 'would update'))
