# Word Catcher 首頁下載與上架接線

## 目前行為

- **已上架**：首頁主按鈕「安裝 Chrome 擴充功能」→  
  https://chromewebstore.google.com/detail/doidjaenokgobflpfbeehhfmigjpkici
- 設定見 `src/config/extension.js`（可用 `VITE_CHROME_EXTENSION_URL` 覆寫）

隱私權政策：  
https://forgetting-curve-ten.vercel.app/privacy.html

## 重新打包 zip

```bash
cd ../word-catcher-ext
npm run build && npm run package
cp build/chrome-mv3-prod.zip ../遺忘曲線/public/extensions/toocheep-word-catcher.zip
```

完整商店文案與開發者帳號檢查：見 `word-catcher-ext/STORE_PUBLISH.md`。
