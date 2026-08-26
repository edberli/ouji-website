# OUJI 三個產品頁品牌輪播 — Design QA

## 測試基準

- source visual truth: `/Volumes/core/ouji-brand-section-exact/source-exact-user.png`
- production assets: `/Volumes/core/ouji-brand-carousel/assets/`（11 張、2151/2152 × 731 PNG）
- 全部產品 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/shop-desktop.png`
- 彩妝 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/makeup-desktop.png`
- 護膚 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/skincare-desktop.png`
- desktop viewport: 1440 × 1000；品牌區實測 1344 × 456 artwork＋42 px controls
- mobile viewport: Browser 最小可測 500 × 844；品牌區 `clientWidth=448`、`scrollWidth=1792`

## Findings

- **無剩餘 P0／P1／P2。** 三頁都沿用用戶指定第 3 款嘅左右構圖、原色品牌字樣、柔和產品質感同 4×2 品牌矩陣。
- **指定差異。** 來源樣板品牌卡右下角圓形箭嘴已按用戶要求移除；翻頁控制只放喺整個 section 下方，唔再混入品牌卡。
- **輪播密度。** 全部產品 4 版、彩妝 3 版、護膚 4 版；桌面有上一版／下一版及相同數量圓點，手機保留 swipe/scroll-snap。

## 五個 fidelity surfaces

- **Fonts and typography:** 品牌名稱、焦點標題、CTA 同分類標題都直接保留喺高解像 raster artwork，避免用網站字體重砌而走樣；翻頁文字沿用網站現有 UI 字體。
- **Spacing and layout rhythm:** desktop 維持來源 2152:731 比例、左焦點／右 4×2 比例、卡距及圓角；controls 置中並與 artwork 保持 12 px 間距。mobile 將同一 artwork 分拆成上方焦點圖及下方品牌矩陣，冇壓細 logo。
- **Colors and visual tokens:** 每頁保留類別色調（全部／護膚藍綠、彩妝粉紅），品牌字樣及卡面以原色顯示；active dot 用網站藍色，disabled button 仍有足夠狀態差異。
- **Image quality and asset fidelity:** 11 張 artwork 全部 2151/2152 × 731；已逐張檢查品牌字樣、產品構圖、無卡內圓形箭嘴、無偽造品牌。少於 8 個剩餘品牌嘅尾版以純產品質感填位，唔建立假連結。
- **Copy and content:** 「熱門品牌／熱門彩妝品牌／熱門護膚品牌」、「今週焦點」、「全部品牌」語意一致；品牌連結使用 catalog vendor 原名及 URL encoding。

## 互動、responsive 同 accessibility

- **全部產品：** 4 slides／4 dots；32 個品牌 hotspot，4 個焦點品牌連結及 4 個全部品牌連結；4 張 desktop artwork 全部成功載入（2152、2151、2152、2152 px）。
- **彩妝：** 3 slides／3 dots；20 個真實品牌 hotspot；最後一版 4 個品牌加 4 個純裝飾格。最尾版實測 `scrollLeft=2688`、`clientWidth=1344`、下一版 disabled。
- **護膚：** 4 slides／4 dots；30 個真實品牌 hotspot；最後一版 6 個品牌加 2 個純裝飾格。最尾版實測 `scrollLeft=4032`、`clientWidth=1344`、下一版 disabled。
- **連結抽查：** `makeup.html?brand=AMUSE` 正確顯示 AMUSE active filter 及 16 張產品卡。
- **手機：** 500 px Browser viewport 下焦點圖及品牌矩陣完整分層、無水平頁面 overflow；controls 448 × 40，可 swipe、翻頁或按圓點。最終 crop 冇左側焦點圖殘邊。
- **Accessibility：** carousel／slide 有 role description；dots、品牌、焦點及全部品牌連結都有 aria label；active dot 用 `aria-current`；狀態由 `aria-live` 宣告；focus-visible outline 保留；reduced-motion 會改用無動畫翻頁。
- **Console：** carousel 0 error、0 warning。頁面本身仍有一項既有 form field id/name issue；護膚頁另有既有 catalog preload timing warning，均唔由本次修改引起。

## 比較歷史

1. **P1 — 單版設計未能展示更多品牌。** 修正：保留 exact artwork，每頁拆成 3–4 版，加入上一版／下一版、圓點及 scroll-snap。Post-fix evidence：三張 desktop screenshot。
2. **P1 — 舊 mobile 做法要橫掃成張 720 px artwork，logo 太細。** 修正：手機用同一 raster 分成焦點及品牌矩陣兩段，品牌卡保持可讀尺寸。
3. **P2 — mobile 品牌矩陣左邊曾露出焦點圖藍色殘邊。** 修正：右側 crop 改為靠右並放大 104%，最終 Browser visual inspection 無殘邊、無右側空白。

## Implementation checklist

- [x] 全部產品 4 版
- [x] 彩妝 3 版
- [x] 護膚 4 版
- [x] 上一版／下一版、圓點、手機 swipe
- [x] 移除所有品牌卡圓形箭嘴
- [x] 原色品牌字樣及高解像 artwork
- [x] 品牌／焦點／全部品牌可點擊
- [x] Desktop、mobile、interaction、responsive、console QA

final result: passed
