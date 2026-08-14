/**
 * Chrome 擴充功能下載設定
 *
 * 上架通過後，在 .env.local 設定：
 *   VITE_CHROME_EXTENSION_URL=https://chromewebstore.google.com/detail/...
 * 重新 build／部署後，首頁會改連商店。
 *
 * 未設定時，改提供 zip 手動安裝。
 */
export const CHROME_EXTENSION_STORE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHROME_EXTENSION_URL) || ''

export const CHROME_EXTENSION_ZIP_URL = '/extensions/toocheep-word-catcher.zip'

export const hasChromeStoreListing = Boolean(
  CHROME_EXTENSION_STORE_URL && /^https?:\/\//i.test(CHROME_EXTENSION_STORE_URL)
)
