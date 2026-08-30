# Shopify 冇咗，點重開

備份喺 `/Volumes/core/ouji-backup/`，每晚 03:30 自動跑
（`~/Library/LaunchAgents/com.ouji.backup.plist`）。

| 檔案 | 係咩 |
|---|---|
| `products.json` | Admin API 原本個 shape。最齊，出咩格式都由呢個推返出嚟 |
| `products.csv` | 我哋自己嘅欄位，一個變體一行。畀人睇同對數 |
| `shopify-import.csv` | **Shopify 匯入格式**，36 個欄照佢個範本 |
| `images/<handle>/` | 原圖 |
| `manifest.json` | 逐個檔 sha256 |
| `backup.log` | 每晚跑咗啲乜 |

## 唔係「import 個 CSV 就搞掂」——圖係另一件事

Shopify 個匯入器讀 `Image Src` 當**網址**，佢自己去攞。所以：

> 舊店一冇咗，任何舊 export 入面嘅 `cdn.shopify.com` 連結全部死。
> 直接 import 會開到 800 件產品，**一張相都冇**。

兩條路，揀一條：

| 情況 | 點做 |
|---|---|
| **舊店仲喺度**（搬店、誤刪要重建） | 乜都唔使做。`shopify-import.csv` 入面 `Image Src` 已經係 cdn.shopify.com 嘅連結，import 嗰陣 Shopify 自己去攞返 |
| **舊店真係冇咗** | import 完個 CSV（相會吉），再跑 `restore_images.py` —— 佢直接讀 `images/` 嘅原檔，經 staged upload 掉返上新店。**唔使搵圖床、唔使公開任何嘢** |

## 還原步驟

**1. 驗備份完唔完整**

```bash
python3 -c "
import json,os,hashlib
m=json.load(open('/Volumes/core/ouji-backup/manifest.json'))
bad=[f for f in m['images'] if not os.path.exists('/Volumes/core/ouji-backup/'+f['path'])]
print(m['products'],'件產品 ·',m['stored_images'],'張圖 · 唔見咗',len(bad))"
```

**2. 開新 Shopify 舖，攞返 Admin API token**

`scripts/shopify_oauth.py`，寫入 `.env` 嘅 `SHOPIFY_ADMIN_TOKEN`。
記得改 `scripts/shopify_admin.py` 個 `SHOP`。

**3. Shopify → Products → Import → 揀 `shopify-import.csv`**

舊店仲生存嘅話，相會跟住 import 一齊入返嚟，跳到第 5 步。

**4. 舊店冇咗先要做：把相掛返上去**

```bash
python3 scripts/restore_images.py --dry-run   # 睇下佢會掂邊啲
python3 scripts/restore_images.py             # 真做
```

預設**只補冇相嗰啲產品**，所以行幾多次都唔會整出重複相。
單件重做用 `--handle <handle>`；連有相嗰啲都要重掛就 `--force`。

（如果你另外有圖床，仲可以行舊路：
`python3 scripts/restore_csv.py --image-base https://你嘅圖床/ouji-images`
出一份指住嗰度嘅 CSV。）

**6. import 完之後仲要補嘅嘢**

CSV 帶唔到嘅：

- **成本價**（`Cost per item` 一欄有，但要開咗 inventory tracking 先入到）
- **庫存分倉**：CSV 只有一個總數，多過一個倉就要用
  `products.json` 入面 `inventoryLevels` 逐個 set 返
- **Metafield**：喺 `products.json`，要用 Admin API 寫返
- **銷售通路**：新舖要自己 publish（`scripts/publish.py` 有現成嘅）
- **Collection 分類**：我哋個站係用 tag 砌分類，tag 有跟住 CSV 入，所以
  唔使重建 collection

**7. 前台**

`ouji-website` 個 repo 喺 GitHub，改 `shopify.js` 頂嘅 Storefront token
同 store domain 就行返。

## 用唔用得着 Shopify 都好

`products.json` 唔綁 Shopify。要搬去 WooCommerce、Shopline、自己寫嘅後台，
照住嗰個 shape 寫個轉換就得 —— `restore_csv.py` 就係一個例子。
