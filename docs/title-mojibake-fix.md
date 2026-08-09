# Shopify 產品標題亂碼修正清單

**42 件產品嘅標題喺 Shopify 源頭係亂碼**，客而家喺 oujikbeauty.com 就咁樣見緊。

來源：`/Volumes/core/ouji-backup/products.json`（備份日 2026-08-08），全店 807 件掃出 42 件；
已對 live Storefront API 抽樣核對，確認係源頭資料壞咗，唔係前端顯示問題。

成因推測：上貨時經過一次唔支援呢啲字嘅編碼轉換（Big5 冇「醯」「肽」「啫」「蔘」）。

## 統計

| | 件數 |
|---|---|
| ✅ 可直接改（規律明確）| **40** |
| ⚠️ 待確認（要對返官方名）| **2** |

## 對照規律

| 壞字 | 正確 | 件數 |
|---|---|---|
| 煙**?**胺 | 煙**醯**胺 | 12 |
| 穀胱甘**?** / 谷胱甘**?** | 穀胱甘**肽** | 13 |
| **?**喱 / **?**哩 | **啫**喱 | 11 |
| 胜**?** | 胜**肽** | 3 |
| 人**?**深層 | 人**蔘**深層 | 1 |

## 逐件清單

| # | handle | 而家（錯） | 改成 | 狀態 |
|---|---|---|---|---|
| 1 | `april-skin-aprilskin-txa-99-80ml-9691` | APRILSKIN TXA 煙?胺 99% 夜間修護面膜 [80ml] | APRILSKIN TXA 煙醯胺 99% 夜間修護面膜 [80ml] | ✅ 可直接改 |
| 2 | `abib-abib-75ml-1931` | Abib 保濕補水美白?喱水分面霜 75ml | Abib 保濕補水美白啫喱水分面霜 75ml | ✅ 可直接改 |
| 3 | `abib-abib-c-60-8477` | Abib 穀胱甘?淡斑提亮維C美白爽膚棉片暗斑墊 60片 | Abib 穀胱甘肽淡斑提亮維C美白爽膚棉片暗斑墊 60片 | ✅ 可直接改 |
| 4 | `abib-abib-ph-1-8842` | Abib 谷胱甘? PH弱酸面膜 1片 | Abib 谷胱甘肽 PH弱酸面膜 1片 | ✅ 可直接改 |
| 5 | `abib-abib-80ml-0333` | Abib 透明質酸清爽保濕?喱面霜 80ml | Abib 透明質酸清爽保濕啫喱面霜 80ml | ✅ 可直接改 |
| 6 | `abib-abib-200ml-1040` | Abib穀胱甘?淡斑爽膚水 200ml | Abib穀胱甘肽淡斑爽膚水 200ml | ✅ 可直接改 |
| 7 | `anua-anua-3-ectoin-50g-4953` | Anua - 視黃醇+3重胜?+Ectoin抗衰老修復晚霜 50g | Anua - 視黃醇+3重胜肽+Ectoin抗衰老修復晚霜 50g | ✅ 可直接改 |
| 8 | `anua-anua-77-2-150ml-4342` | Anua 77%水蜜桃+煙?胺2% 乳液 150ml | Anua 77%水蜜桃+煙醯胺2% 乳液 150ml | ✅ 可直接改 |
| 9 | `anua-anua-77-30ml-3550` | Anua 77%水蜜桃煙?胺發酵乳酸美白保濕精華 30ml | Anua 77%水蜜桃煙醯胺發酵乳酸美白保濕精華 30ml | ✅ 可直接改 |
| 10 | `anua-anua-77-50ml-4373` | Anua 77%水蜜桃煙?胺發酵乳酸美白保濕霜 50ml | Anua 77%水蜜桃煙醯胺發酵乳酸美白保濕霜 50ml | ✅ 可直接改 |
| 11 | `anua-anua-70-2025-10ml-9729` | Anua 水蜜桃 70% 煙?胺精華 迷你裝 [2025 版本 - 10ml] | Anua 水蜜桃 70% 煙醯胺精華 迷你裝 [2025 版本 - 10ml] | ✅ 可直接改 |
| 12 | `anua-anua-uv-01-50ml-4458` | Anua 水蜜桃煙?胺抗 UV 提亮防曬乳 01 融化水蜜桃 [50ml] | Anua 水蜜桃煙醯胺抗 UV 提亮防曬乳 01 融化水蜜桃 [50ml] | ✅ 可直接改 |
| 13 | `anua-anua-120ml-3666` | Anua 魚腥草水楊酯去角質潔面?喱 120ml | Anua 魚腥草水楊酯去角質潔面啫喱 120ml | ✅ 可直接改 |
| 14 | `bring-green-bring-green-super-lemon-50ml-3ml-6383` | BRING GREEN SUPER LEMON 穀胱甘?亮白精華 50ml【贈：夜間活化精華 3ml】 | BRING GREEN SUPER LEMON 穀胱甘肽亮白精華 50ml【贈：夜間活化精華 3ml】 | ✅ 可直接改 |
| 15 | `bring-green-bring-green-super-lemon-10-6529` | BRING GREEN SUPER LEMON 穀胱甘?清新面膜 10片裝（韓國版） | BRING GREEN SUPER LEMON 穀胱甘肽清新面膜 10片裝（韓國版） | ✅ 可直接改 |
| 16 | `bring-green-bring-green-super-lemon-90-7540` | BRING GREEN SUPER LEMON 穀胱甘?爽膚棉片 90片 | BRING GREEN SUPER LEMON 穀胱甘肽爽膚棉片 90片 | ✅ 可直接改 |
| 17 | `bring-green-bring-green-super-lemon-30ml-30ml-8464` | BRING GREEN SUPER LEMON 穀胱甘?眼霜 30ml＋30ml | BRING GREEN SUPER LEMON 穀胱甘肽眼霜 30ml＋30ml | ✅ 可直接改 |
| 18 | `bring-green-bring-green-super-lemon-100ml-7702` | BRING GREEN SUPER LEMON 穀胱甘?睡眠面膜 100ml【贈：刮勺】 | BRING GREEN SUPER LEMON 穀胱甘肽睡眠面膜 100ml【贈：刮勺】 | ✅ 可直接改 |
| 19 | `beauty-of-joseon-beauty-of-joseon-100ml-100ml-2872` | Beauty of Joseon 杏花去角質?喱100ml [100ml] | Beauty of Joseon 杏花去角質啫喱100ml [100ml] | ✅ 可直接改 |
| 20 | `beauty-of-joseon-beauty-of-joseon-100ml-4678` | Beauty of Joseon 青梅清爽潔?哩 [100ml] | Beauty of Joseon 青梅清爽潔啫喱 [100ml] | ✅ 可直接改 |
| 21 | `beauty-of-joseon-beauty-of-joseon-210ml-0130` | Beauty of Joseon|人?深層清潔卸妝油210ml | Beauty of Joseon|人蔘深層清潔卸妝油210ml | ✅ 可直接改 |
| 22 | `cosrx-cosrx-6-150ml-5658` | COSRX 6 胜?肌膚增強劑 [150ml] | COSRX 6 胜肽肌膚增強劑 [150ml] | ✅ 可直接改 |
| 23 | `cosrx-cosrx-ph-150ml-0511` | COSRX 低 pH 溫和早安潔面?喱 [150ml] | COSRX 低 pH 溫和早安潔面啫喱 [150ml] | ✅ 可直接改 |
| 24 | `cosrx-cosrx-15-20ml-4637` | COSRX 煙?胺 15% 精華 [20ml] | COSRX 煙醯胺 15% 精華 [20ml] | ✅ 可直接改 |
| 25 | `cosrx-cosrx-34g-x-3-7232` | COSRX 胜?膠原蛋白提拉光澤水凝膠面膜 [34g x 3片] | COSRX 胜肽膠原蛋白提拉光澤水凝膠面膜 [34g x 3片] | ✅ 可直接改 |
| 26 | `cosrx-cosrx-25ml-1070` | COSRX 高級蝸牛?眼霜25ml | （未定） | ⚠️ 待確認 |
| 27 | `haruharu-wonder-haruharu-wonder-aha-100ml-1783` | Haruharu Wonder 黑米三重AHA溫和潔面?喱 100ml | Haruharu Wonder 黑米三重AHA溫和潔面啫喱 100ml | ✅ 可直接改 |
| 28 | `ksecret-ksecret-1988-15-30ml-0621` | KSECRET 首爾1988 亮澤精華：煙?胺 15% + 柚子 [30ml] | KSECRET 首爾1988 亮澤精華：煙醯胺 15% + 柚子 [30ml] | ✅ 可直接改 |
| 29 | `ksecret-ksecret-1988-5-50ml-0614` | KSECRET 首爾1988 膠囊面霜：煙?胺 5% + 柚子 [50ml] | KSECRET 首爾1988 膠囊面霜：煙醯胺 5% + 柚子 [50ml] | ✅ 可直接改 |
| 30 | `purito-purito-seoul-100ml-1054` | PURITO SEOUL 新版 燕麥舒緩?喱面霜 100ml | PURITO SEOUL 新版 燕麥舒緩啫喱面霜 100ml | ✅ 可直接改 |
| 31 | `round-lab-round-lab-30-0652` | ROUND LAB 維他命煙?胺淡斑精華 [30毫升] | ROUND LAB 維他命煙醯胺淡斑精華 [30毫升] | ✅ 可直接改 |
| 32 | `round-lab-round-lab-20-x-10-0775` | ROUND LAB 維他命煙?胺淡斑精華面膜套裝 [20毫升 x 10片] | ROUND LAB 維他命煙醯胺淡斑精華面膜套裝 [20毫升 x 10片] | ✅ 可直接改 |
| 33 | `round-lab-round-lab-50-0690` | ROUND LAB 維他命煙?胺淡斑面霜 [50毫升] | ROUND LAB 維他命煙醯胺淡斑面霜 [50毫升] | ✅ 可直接改 |
| 34 | `some-by-mi-somebymi-30-3078` | SOMEBYMI 柚子?酸胺30天奇蹟美白精華 | （未定） | ⚠️ 待確認 |
| 35 | `some-by-mi-somebymi-1-1463` | SOMEBYMI 真實穀胱甘?亮膚面膜 1片 | SOMEBYMI 真實穀胱甘肽亮膚面膜 1片 | ✅ 可直接改 |
| 36 | `some-by-mi-somebymi-100ml-0497` | SOMEBYMI 蝸牛獨家積雪草修復弱酸性潔面?喱 100ml | SOMEBYMI 蝸牛獨家積雪草修復弱酸性潔面啫喱 100ml | ✅ 可直接改 |
| 37 | `some-by-mi-somebymi-200ml-4464` | SOMEBYMI 酵母穀胱甘?柔膚水 200ml | SOMEBYMI 酵母穀胱甘肽柔膚水 200ml | ✅ 可直接改 |
| 38 | `some-by-mi-somebymi-1-4136` | SOMEBYMI 酵母穀胱甘?精華面膜 1片 | SOMEBYMI 酵母穀胱甘肽精華面膜 1片 | ✅ 可直接改 |
| 39 | `some-by-mi-somebymi-30-4143` | SOMEBYMI 酵母穀胱甘?面膜 30片 | SOMEBYMI 酵母穀胱甘肽面膜 30片 | ✅ 可直接改 |
| 40 | `skinfood-skinfood-100ml-4386` | Skinfood (新版) 菠蘿去角質?喱 100ml | Skinfood (新版) 菠蘿去角質啫喱 100ml | ✅ 可直接改 |
| 41 | `torriden-torriden-dive-in-100ml-0183` | Torriden DIVE-IN 低分子透明質酸保濕舒緩?喱面霜100ml | Torriden DIVE-IN 低分子透明質酸保濕舒緩啫喱面霜100ml | ✅ 可直接改 |
| 42 | `abib-abibph-10-8859` | 韓國abibPH弱酸面膜10片裝-谷胱甘?(盒裝) | 韓國abibPH弱酸面膜10片裝-谷胱甘肽(盒裝) | ✅ 可直接改 |

## ⚠️ 兩件要人 confirm

- **COSRX 高級蝸牛?眼霜25ml**
  - `cosrx-cosrx-25ml-1070`
  - COSRX Advanced Snail — 官方英文名要對返先知係「胜肽」定「黏液」

- **SOMEBYMI 柚子?酸胺30天奇蹟美白精華**
  - `some-by-mi-somebymi-30-3078`
  - Some By Mi Yuja Niacin —「菸」嘅機會最大，但要對返包裝

## 點改

Shopify admin → 產品 → 逐件改「標題」。**只改標題，唔好掂 handle**（handle 一改就斷晒
所有現有連結、SEO 同我哋啲資料檔嘅對應）。

改完之後可以行呢句核對，應該回 0：

```bash
curl -s 'https://5rerjn-mt.myshopify.com/products.json?limit=250' \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['products'];print(sum(1 for p in d if '?' in p['title']))"
```

（`products.json` 一次最多 250 件，全店 807 件要揭 4 版 `&page=1..4`）