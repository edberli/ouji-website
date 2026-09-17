#!/bin/zsh
# 每晚備份 OUJI 全店。由 launchd 叫（com.ouji.backup.plist）。
#
# 外置碟未掛就直接收工 —— 唔好靜靜哋寫落內置 SSD，嗰度長期得幾十 GB。
set -euo pipefail

ROOT="/Users/winstonli/Documents/ouji-website"
OUT="/Volumes/core/ouji-backup"
LOG="$OUT/backup.log"

if [ ! -d /Volumes/core ]; then
  echo "$(date '+%F %T')  /Volumes/core 未掛載，跳過" >> "/tmp/ouji-backup-skipped.log"
  exit 1
fi

mkdir -p "$OUT"
{
  echo "===== $(date '+%F %T') ====="
  # 更新前先封存上一個已驗證版本，避免今日 Shopify 誤刪覆蓋昨日唯一副本。
  if [ -f "$OUT/manifest.json" ]; then
    /usr/bin/python3 "$ROOT/scripts/backup_snapshots.py" --current "$OUT"
  fi
  /usr/bin/python3 "$ROOT/scripts/backup_store.py" --out "$OUT" --stamp "$(date '+%F')"
  echo "--- 出還原用 CSV ---"
  # Image Src 用返 cdn.shopify.com：舊店仲喺度嗰陣（搬店、誤刪重建）import
  # 就攞得返相。舊店真係冇咗嗰日連結會死 —— 嗰個情況用 restore_images.py，
  # 佢直接讀返 images/ 嘅原檔掛上去，唔使搵地方放相。
  /usr/bin/python3 "$ROOT/scripts/restore_csv.py" --backup "$OUT"
  /usr/bin/python3 "$ROOT/scripts/backup_snapshots.py" --current "$OUT"
} >> "$LOG" 2>&1

# log 唔好無限咁大 —— 淨低最後 2000 行。
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
