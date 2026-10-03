#!/usr/bin/env python3
"""Record/check legacy CSS metrics; --baseline PATH writes a new baseline without editing styles.css."""
import argparse,json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--baseline',type=Path,default=root/'ds/ratchet-baseline.json');p.add_argument('--write-baseline',action='store_true');args=p.parse_args()
s=(root/'styles.css').read_text();metrics={'bytes':(root/'styles.css').stat().st_size,'distinct_hex':len(set(re.findall(r'#[0-9a-fA-F]{3,8}\b',s))),'important':len(re.findall(r'!important\b',s)),'font_sizes':len(set(re.findall(r'font-size\s*:\s*[^;\n}]+',s))),'breakpoints':len(set(re.findall(r'@media[^\{]+',s))),'z_index_values':len(set(re.findall(r'z-index\s*:\s*[^;\n}]+',s)))}
if args.write_baseline:
    if args.baseline.exists():sys.exit('Baseline exists; refusing overwrite')
    args.baseline.write_text(json.dumps(metrics,indent=2)+'\n');print(metrics);sys.exit(0)
if not args.baseline.exists():sys.exit('Baseline missing: run --write-baseline')
baseline=json.loads(args.baseline.read_text());bad=[k for k in metrics if metrics[k]>baseline[k]]
# Only local raster references are examined; remote Shopify photos do not have a checked-in size.
for image in [*(root/'assets').rglob('*'), *(root/'ds/proof').rglob('*')]:
    if image.suffix.lower() in ('.png','.jpg','.jpeg','.webp','.avif') and image.stat().st_size>400*1024:
        if any(image.relative_to(root).as_posix() in x.read_text(errors='replace') for x in list((root/'ds').rglob('*.html'))):bad.append(str(image.relative_to(root)))
print('current',metrics,'baseline',baseline,'regressions',bad)
sys.exit(bool(bad))
