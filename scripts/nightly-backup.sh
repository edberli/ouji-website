#!/bin/bash
# 每晚備份 OUJI 全店。由 launchd 叫（com.ouji.backup.plist）。
#
# 外置碟未掛就直接收工 —— 唔好靜靜哋寫落內置 SSD，嗰度長期得幾十 GB。
set -u

ROOT="/Users/winstonli/Documents/ouji-website"
OUT="/Volumes/core/ouji-backup"
LOG="$OUT/backup.log"

if [ ! -d /Volumes/core ]; then
  echo "$(date '+%F %T')  /Volumes/core 未掛載，跳過" >> "/tmp/ouji-backup-skipped.log"
  exit 0
fi

mkdir -p "$OUT"
{
  echo "===== $(date '+%F %T') ====="
  /usr/bin/python3 "$ROOT/scripts/backup_store.py" --out "$OUT" --stamp "$(date '+%F')"
  echo "--- 出還原用 CSV ---"
  /usr/bin/python3 "$ROOT/scripts/restore_csv.py" --backup "$OUT" --no-images
} >> "$LOG" 2>&1

# log 唔好無限咁大 —— 淨低最後 2000 行。
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
