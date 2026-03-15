# MemoFlip - AI Agent 操作規則

## 🚨 嚴重事故紀錄（2026-02-20）

### 事故描述
AI Agent 在執行「測試 tips 功能是否正常顯示」任務時，透過 `execute_browser_javascript` 工具直接對瀏覽器執行 JavaScript，使用 `localStorage.setItem('memoflip_cards', ...)` 覆寫了用戶原本已匯入的所有卡片資料，導致資料**永久遺失**。

### 根本原因
Agent 為了驗證功能，在 localStorage 中注入測試資料時，使用了「覆蓋」而非「追加/合併」的方式，未保護既有用戶資料。

---

## ❌ 絕對禁止事項

1. **絕對禁止**在用戶的瀏覽器中執行任何會**寫入或修改** `localStorage` 的 JavaScript
   - 禁止：`localStorage.setItem(...)`
   - 禁止：`localStorage.removeItem(...)`
   - 禁止：`localStorage.clear()`
   - 允許：`localStorage.getItem(...)` （唯讀，僅供檢查）

2. **絕對禁止**在未告知用戶的情況下，對任何持久化資料（DB、檔案、storage）執行任何寫入或刪除操作

3. 測試或驗證功能時，**只能使用唯讀操作**，不可修改現有資料

---

## ✅ 正確做法

- 驗證 localStorage 資料時：只用 `getItem` 讀取，截圖回報給用戶
- 若需寫入測試資料：必須先告知用戶，且必須確認是在**空的/專用測試環境**中進行
- 若需驗證 UI 互動，優先透過**點擊真實按鈕**（非 JS 注入）達成

---

## 原則

> **用戶的資料是神聖的。任何可能破壞用戶資料的操作，必須先取得明確同意。**

---

## 🚨 嚴重事故紀錄（2026-02-22：UI 渲染崩潰與資源洩漏）

### 事故描述
在處理 UI 側邊欄（便條紙/Sticky Notes）與卡片評分存檔時，發生了嚴重的畫面破圖與閃退（Safari Compositor Crash / Jetsam 介入）。畫面下方突然被「切平」且失去響應。

### 根本原因
1. **CSS 佈局缺乏邊界控制（Overflow Omission）**：
   在設計包含多個動態產生子元素的容器（`.rc-sidebar`）時，使用了 `position: sticky` 和 `Flexbox`，但忘記設定 `max-height` 與 `overflow-y: auto;`。導致子節點無限增加時，容器高度無止盡撐大，最終導致 iOS Safari 渲染引擎計算過載而強制丟棄渲染層（破圖/切平）。
2. **JS 閉包與定時器未清除（Closure Memory Leak）**：
   在 `storage.js` 的 `saveCards` 中，使用了 `setTimeout` 將龐大的卡片陣列推遲到下一個 Event Loop 執行 `JSON.stringify`。但因為沒有實作 `clearTimeout`（Debounce 防抖），短時間內快速連按會產生多個並行的定時器，同時將多個巨大的陣列緩存在閉包中無法被 GC 回收，導致 CPU 與記憶體瞬間爆衝。

### ✅ 預防與正確做法

1. **CSS 列表/彈性容器必備保護**：
   任何預期會「不斷增加子節點」的容器（特別是搭配 `flex` 或 `position: sticky` 時），**第一時間就必須加上 `max-height`（或 `height: 100%` 等明確限制）與 `overflow-y: auto;`**。
2. **定時器與全域綁定必備清理**：
   只要用到 `setTimeout`、`setInterval` 或是 `addEventListener`，特別是內部有對**大型物件**或 **DOM** 進行操作時，**絕對要確保有對應的清理機制**（如 `clearTimeout` 或 `removeEventListener`），並在適當的時機（如連擊防抖、元件卸載）觸發。
