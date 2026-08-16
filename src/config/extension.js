/**
 * Chrome 擴充功能下載設定
 *
 * 正式商店頁（已公開）：
 * https://chromewebstore.google.com/detail/doidjaenokgobflpfbeehhfmigjpkici
 *
 * 可用 VITE_CHROME_EXTENSION_URL 覆寫；設為空字串可暫時退回 zip 安裝。
 */
const PUBLISHED_STORE_URL =
  'https://chromewebstore.google.com/detail/doidjaenokgobflpfbeehhfmigjpkici'

const envUrl =
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_CHROME_EXTENSION_URL : undefined

export const CHROME_EXTENSION_STORE_URL =
  envUrl === undefined || envUrl === null || envUrl === ''
    ? PUBLISHED_STORE_URL
    : String(envUrl)

export const CHROME_EXTENSION_ZIP_URL = '/extensions/toocheep-word-catcher.zip'

export const hasChromeStoreListing = Boolean(
  CHROME_EXTENSION_STORE_URL && /^https?:\/\//i.test(CHROME_EXTENSION_STORE_URL)
)
