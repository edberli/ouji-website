# Shopify 冇咗，點重開

最新備份喺 `/Volumes/core/ouji-backup/`，每晚 03:30 自動跑
（`~/Library/LaunchAgents/com.ouji.backup.plist`）。

版本保留：

- `/Volumes/core/ouji-backup-snapshots/`：最近 7 個每日版本（APFS clone，冇變嘅資料共用區塊）
- `/Volumes/Ultra Touch/ouji-backups/`：第 8 日起嘅舊版本
- 舊版本只會喺 HDD 副本完成並通過全圖片 SHA-256 驗證後，先由 SSD 移除
- Ultra Touch 未掛載、圖片欠缺或 checksum 錯誤時，工作會失敗並保留原檔

驗證目前備份：

```bash
python3 scripts/backup_snapshots.py --validate-only
```

## 覆蓋範圍（重要）

每晚備份覆蓋兩層：

1. **產品目錄（完整）**：產品文字、handle、價錢、成本、變體、SKU／barcode、庫存、
   SEO、metafield、publication metadata，加本地實體原圖（`images/`，逐張 SHA-256）。
2. **全店資源（`full/`）**：訂單（含全部歷史）、顧客、頁面、網誌、選單、折扣、
   送貨設定、市場、商店資料、政策、metaobjects、全部主題檔案、Shopify Files 清單。

仲未包含：Shopify Files 二進位檔（只存清單同 URL）、禮品卡（店內現時 0 張）、
Shopify Payments 財務記錄，以及第三方 app 自己嘅資料（API 唔提供）。完整還原演習未做。

| 檔案 | 係咩 |
|---|---|
| `products.json` | Admin API 原本個 shape。最齊，出咩格式都由呢個推返出嚟 |
| `products.csv` | 我哋自己嘅欄位，一個變體一行。畀人睇同對數 |
| `shopify-import.csv` | **Shopify 匯入格式**，36 個欄照佢個範本 |
| `images/<handle>/` | 原圖 |
| `manifest.json` | 逐個檔 sha256 |
| `backup.log` | 每晚跑咗啲乜 |

### 全店資源（`full/`）

每晚除咗產品，仲會匯出以下資源（`scripts/backup_full.py`）：

| 檔案 | 內容 | 敏感度 |
|---|---|---|
| `full/orders.json` | 全部訂單（含 line items、fulfillment、退款、交易、地址） | 含顧客資料，權限 600 |
| `full/customers.json` | 全部顧客（含地址、營銷同意、消費統計） | 含個人資料，權限 600 |
| `full/pages.json` | 網店頁面（含 HTML 內容） | |
| `full/blogs.json` | 網誌及文章 | |
| `full/menus.json` | 導覽選單（最多三層） | |
| `full/discounts.json` | 折扣代碼及自動折扣 | |
| `full/shipping.json` | 送貨設定檔、區域、運費定義 | |
| `full/markets.json` | 市場設定 | |
| `full/shop.json` | 商店資料、語言設定 | |
| `full/policies.json` | 政策頁（REST policies） | |
| `full/metaobjects.json` | Metaobject 定義及全部條目 | |
| `full/themes/<theme>/` | 全部主題檔案（Liquid／JSON／資產） | |
| `full/files.json` | Shopify Files 清單（15,000+ 條記錄；**只存 metadata，未下載二進位檔**） | |
| `full/coverage.json` | 每一類嘅匯出狀態同數量；有失敗會 exit 1 | |

注意：`files.json` 只有檔案清單同 URL，未包含檔案本身；禮品卡（店內現時 0 張）同
Shopify Payments 財務記錄亦唔喺呢個備份範圍。

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
