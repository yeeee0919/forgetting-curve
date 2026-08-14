# Word Catcher 首頁下載與上架接線

## 目前行為

- 未設定 `VITE_CHROME_EXTENSION_URL`：首頁顯示「下載擴充功能（zip）」+ 手動安裝說明  
  檔案：`public/extensions/toocheep-word-catcher.zip`
- 已設定商店 URL：首頁主按鈕改為「安裝 Chrome 擴充功能」並開啟商店頁

隱私權政策（商店必填）：  
https://forgetting-curve-ten.vercel.app/privacy.html  
（本機：`/privacy.html`）

## 上架通過後

1. 在專案根目錄 `.env.local` 加入：

```bash
VITE_CHROME_EXTENSION_URL=https://chromewebstore.google.com/detail/你的擴充功能ID
```

2. 重新 `npm run build` 並部署到 Vercel（或在 Vercel 專案 Environment Variables 設定同名變數後 Redeploy）。

## 重新打包 zip

```bash
cd ../word-catcher-ext
npm run build && npm run package
cp build/chrome-mv3-prod.zip ../遺忘曲線/public/extensions/toocheep-word-catcher.zip
```

完整商店文案與開發者帳號檢查：見 `word-catcher-ext/STORE_PUBLISH.md`。
