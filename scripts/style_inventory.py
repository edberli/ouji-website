#!/usr/bin/env python3
"""Read-only inventory of page inline styles, style blocks, and extra linked sheets."""
import argparse,re
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);args=p.parse_args()
for page in sorted(args.root.rglob('*.html')):
    if any(part in ('node_modules','.git','ds') for part in page.parts):continue
    s=page.read_text(errors='replace'); blocks=list(re.finditer(r'<style\b[^>]*>.*?</style\s*>',s,re.I|re.S));inline=len(re.findall(r'\sstyle\s*=\s*["\']',s,re.I));styles=re.findall(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>',s,re.I)
    href=[re.search(r'href=["\']([^"\']+)',link,re.I).group(1) for link in styles if re.search(r'href=["\']([^"\']+)',link,re.I)]
    print(f'{page.relative_to(args.root)}: blocks={len(blocks)} lines={[s.count(chr(10),0,m.start())+1 for m in blocks]} inline={inline} stylesheets={href}')
