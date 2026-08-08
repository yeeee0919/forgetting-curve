/**
 * 驗證 sprite TTS 重試判斷（與 audioSprite.js 的 isRetryableTtsError 同步）
 * 執行：node test_retrySprite.js
 */
function isRetryableTtsError(err) {
  const msg = err?.message || ''
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return true
  if (/\b5\d{2}\b/.test(msg)) return true
  return false
}

const cases = [
  ['Gemini TTS API error: 429 — quota', true],
  ['Gemini TTS API error: 503 — unavailable', true],
  ['Gemini TTS API error: 500 — boom', true],
  ['RESOURCE_EXHAUSTED', true],
  ['rate limit quota exceeded', true],
  ['Gemini TTS API error: 400 — bad request', false],
  ['[TTS] No API key — 請在設定中輸入 Gemini API Key', false],
  ['timeout after 5 seconds', false],  // 舊版 includes('5') 會誤判
  ['key length is 39 chars', false],
  ['', false],
]

let failed = 0
for (const [msg, expected] of cases) {
  const got = isRetryableTtsError(new Error(msg))
  const ok = got === expected
  console.log(`${ok ? '✓' : '✗'} ${JSON.stringify(msg)} → ${got} (expect ${expected})`)
  if (!ok) failed++
}

// 確認 source 仍含正確正則（防回歸）
import { readFileSync } from 'fs'
const src = readFileSync(new URL('./src/services/audioSprite.js', import.meta.url), 'utf8')
const checks = [
  ['export function isRetryableTtsError', src.includes('export function isRetryableTtsError')],
  ['5xx word-boundary regex', src.includes('/\\b5\\d{2}\\b/')],
  ['cancellableSleep used in retry', src.includes('cancellableSleep(delay, cancelRef)')],
  ['no naive includes(5)', !src.includes("includes('5')")],
]
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} source: ${label}`)
  if (!ok) failed++
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll retry checks passed')
