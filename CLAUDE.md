# WAVE Support — Claude Code 專案說明

## 專案概述
**WAVE Support** 是 Ocean Doula（oceandoula.com）的 AI 互動式生產計畫書產生器。
- **定位**：台灣第一個 AI 互動式生產計畫書產生器（Beta）
- **工具網址**：https://oceandoula.github.io/birthplangenerator/
- **GitHub Repo**：oceandoula/birthplangenerator
- **主要檔案**：`index.html`（單一檔案，所有功能都在裡面）
- **Owner**：Naphy（Ocean Doula 創辦人，在澳洲伯斯）

---

## 技術架構
- **前端**：純 HTML + CSS + JS，無框架
- **部署**：GitHub Pages（push 後約 1 分鐘生效）
- **字體**：Noto Serif TC + Noto Sans TC（Google Fonts）
- **付款**：Stripe（隨心定價 minimum $3，建議 $9）
- **Email**：ConvertKit（API 已移除，不再自動訂閱）
- **回饋**：Google Forms（image ping 方式送出，不需跳頁）
- **狀態儲存**：localStorage

---

## 功能清單

### ✅ 已完成
- 完整問卷（9 大類別，70+ 選項）
- **Wizard 模式**（一題一頁，第一次進來預設開啟）
- **全覽模式**（回來修改時預設，或按「切換全覽模式」）
- Enter / 方向鍵導航（左←上一題，右→/Enter 下一題）
- 中英文切換（所有選項已翻譯）
- AI 文字計畫書（溫暖段落式，免費）
- **視覺計畫書**（A4 橫向，每排 8 個，section 標題 merge 對應卡片寬度，第一頁填滿再分頁）
- 83 個手繪 SVG icon
- 解鎖碼系統
- 星星評分（⭐×5，點擊自動 image ping 送 Google Forms）
- localStorage 自動儲存
- PNG / PDF 下載
- BETA 標籤（工具 header + landing page）
- 手機版 header 修正（white-space:nowrap）

### 🔑 解鎖碼清單
```javascript
'WAVE2026': 'basic', 'OCEAN0726': 'basic',
'WAVE2027': 'basic', 'OCEAN1026': 'basic',
'WAVEPLUS': 'pro', 'OCEAN97': 'pro',
'NAPHY001'~'NAPHY010': 'pro',
'WAVEBETA': 'pro', 'OCEANTEAM': 'pro',
'WAVEFREE': 'pro',        // 通用測試碼
'WAVEFREE01'~'WAVEFREE05': 'pro'  // 個人測試碼
```

---

## 視覺計畫書排版邏輯（重要！）

### 分頁
- `renderPages()` → 把所有 cards 排成 rows → 按 row 高度分頁
- 第一頁可用高度 = `PH - HEADER_H - PHIL_H - FOOTER_H - 24 - textRowsH`
- 後續頁 = `PH - HEADER_H - FOOTER_H - 16`

### 排版（`buildPage()` 裡的 flow layout）
- 兩個 helper function：`placeCard(item, sec)` 和 `placeFill(sec)`
- 所有卡片連續排列，每排 8 個（`COLS = 8`）
- 遇到新 section → 先補滿當前排（用下一個 section 的顏色）→ 畫 section bar → 繼續排卡片
- Section bar 橫跨它下面那排所有屬於它的卡片（merge 效果）
- 最後一排補滿淡色佔位卡

### Short answer 題
- 陪產者、生產地點等 text 類型題目
- 顯示在 header 的生產理念下方（白色底框，小字）
- 不顯示在 icon 卡片區

---

## 定價策略
| 方案 | 價格 | 說明 |
|------|------|------|
| 文字版 | 免費（Launch 期間限時） | AI 生成段落式計畫書 |
| 視覺圖卡 | 隨心定價，建議 $9 USD，最低 $3 | 優惠至 2026/8/31，之後 $19 |
| 視覺 + 諮詢 | $97 USD | 含 Naphy 60 分鐘一對一 |

### Payment Links
- 隨心定價（視覺版）：`https://dub.sh/wavebirthplan`
- $97 諮詢：`https://buy.stripe.com/6oU14g99gec37u8dpBgMw04`

---

## Google Forms
- 中文版 Form ID：`1FAIpQLSfXL5ktgF0fTI38a63bakLJAIcF_Z9L6yXU4jUs9vMfzwXQnA`
- 英文版 Form ID：`1FAIpQLSecFLWo4F89NUffi5nmer6nEYO65x16HBbtI8tP54MYiKfxVg`
- 星星評分 entry：`entry.785284528`（1-5 分）

---

## 文案核心
**Hero**：「我怕痛、怕被剪、怕剖腹。」妳說出口了嗎？

**痛點三張卡**：
- 😰 怕痛 → 非藥物減痛、笑氣、硬脊膜外⋯
- ✂️ 怕剪 → WHO 建議低於 10%，妳在行使知情同意的權利
- 🤍 怕剖腹 → 說出來才有對話可能

**遺憾文案**：
「假如當年我有開口要求，會不會不一樣⋯⋯」
不要多年後回想，才後悔自己沒說出口。
說了沒用？也許。但沒說，一定沒用。
同樣的產房、同樣的醫護——說出口的媽媽，和沒說的媽媽，經歷的往往是兩種故事。

---

## Wix 頁面架構（oceandoula.com）

### Home 頁嵌入
- `wave-home-block.html` — 深色漸層區塊，含波浪過渡，右側計畫書截圖
- `wave-floating-btn.html` — 漂浮按鈕（固定左下角）

### WAVE 專頁（/wave）
- `wave-s1-hero.html` — Hero 深色背景
- `wave-s2-problem.html` — 痛點三張卡 + 遺憾文案
- `wave-s3-steps.html` — 三步驟
- `wave-s4-mockup.html` — 視覺計畫書預覽
- `wave-s5-features.html` — 功能四張卡片
- `wave-s6-didyouknow.html` — 妳可能不知道滾動卡片
- `wave-s7-pricing.html` — 定價三方案
- `wave-s8-faq.html` — 常見問題
- `wave-s9-finalcta.html` — 最後 CTA

---

## 待辦事項
- [ ] Email 功能（填完問卷後寄文字版給用戶）
- [ ] Icon 可讀性改善（對照 AAC 標準）
- [ ] Mockup 截圖更新（用最新排版版本）
- [ ] 收集 Beta feedback，準備正式 launch

---

## 重要注意事項
1. **Token 用完記得 revoke**，每次 push 後立刻刪掉
2. 所有 JS 函式定義順序很重要（`setLang` 要在 CATEGORIES 定義後）
3. 視覺計畫書 SVG 超過 48KB 會讓 Wix timeout，不要直接嵌入大 SVG
4. `col++` 重複是造成卡片間距問題的根本原因（已修）
5. Page split 按 row 計算高度，不是按 section

