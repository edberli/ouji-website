#!/usr/bin/env python3
"""Validate, snapshot and archive the OUJI catalogue backup safely."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


REQUIRED = ("products.json", "products.csv", "shopify-import.csv", "manifest.json")


def digest(path, buf=1 << 20):
    h = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(buf):
            h.update(chunk)
    return h.hexdigest()


def validate(root, full=True):
    root = Path(root)
    for name in REQUIRED:
        p = root / name
        if not p.is_file() or p.stat().st_size == 0:
            raise RuntimeError(f"欠缺或空白：{p}")
    products = json.loads((root / "products.json").read_text())
    manifest = json.loads((root / "manifest.json").read_text())
    if len(products) != manifest.get("products"):
        raise RuntimeError("products.json 數量與 manifest 不符")
    if manifest.get("missing_images") != 0:
        raise RuntimeError(f"仍欠 {manifest.get('missing_images')} 張圖片")
    images = manifest.get("images") or []
    if len(images) != manifest.get("stored_images"):
        raise RuntimeError("manifest 圖片數量不符")
    for item in images:
        p = root / item["path"]
        if not p.is_file() or p.stat().st_size != item["bytes"]:
            raise RuntimeError(f"圖片欠缺或大小不符：{item['path']}")
        if full and digest(p) != item["sha256"]:
            raise RuntimeError(f"圖片 checksum 錯誤：{item['path']}")
    return manifest


def clone(src, dst):
    src, dst = Path(src), Path(dst)
    if dst.exists():
        validate(dst, full=False)
        return
    tmp = dst.with_name("." + dst.name + ".tmp")
    if tmp.exists():
        shutil.rmtree(tmp)
    dst.parent.mkdir(parents=True, exist_ok=True)
    # Explicit APFS clone: unchanged file data shares blocks instead of consuming a full copy.
    subprocess.run(["/bin/cp", "-cR", str(src), str(tmp)], check=True)
    for ignored in ("backup.log",):
        p = tmp / ignored
        if p.exists():
            p.unlink()
    validate(tmp, full=True)
    os.replace(tmp, dst)


def archive_old(ssd, hdd, keep):
    snapshots = sorted(p for p in Path(ssd).iterdir() if p.is_dir() and not p.name.startswith("."))
    for src in snapshots[:-keep]:
        dst = Path(hdd) / src.name
        clone(src, dst)
        # Never remove the SSD copy until the HDD copy passes a full checksum readback.
        validate(dst, full=True)
        shutil.rmtree(src)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--current", default="/Volumes/core/ouji-backup")
    ap.add_argument("--ssd", default="/Volumes/core/ouji-backup-snapshots")
    ap.add_argument("--hdd", default="/Volumes/Ultra Touch/ouji-backups")
    ap.add_argument("--keep", type=int, default=7)
    ap.add_argument("--label")
    ap.add_argument("--validate-only", action="store_true")
    args = ap.parse_args()
    manifest = validate(args.current, full=True)
    if args.validate_only:
        print(f"OK：{manifest['products']} 件產品、{manifest['stored_images']} 張圖片")
        return
    if not Path(args.hdd).parent.is_dir():
        raise SystemExit("Ultra Touch 未掛載；不建立／刪除快照")
    label = args.label or manifest.get("taken")
    if not label:
        raise SystemExit("manifest 無 taken 日期，無法命名快照")
    clone(args.current, Path(args.ssd) / label)
    Path(args.hdd).mkdir(parents=True, exist_ok=True)
    archive_old(args.ssd, args.hdd, args.keep)
    print(f"快照完成：{label}；SSD 保留最近 {args.keep} 份，舊版已驗證後歸檔 HDD")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"備份快照失敗：{exc}", file=sys.stderr)
        raise SystemExit(1)
