// ──────────────────────────────────────────────────────────────────────────────
// Audio Sprite Service
// 將一個 tab 的所有題目合併成一個 WAV 音檔，並記錄每題的時間戳
// 格式：[題目1][靜音5s][答案1][靜音1.5s][題目2][靜音5s][答案2]...
// ──────────────────────────────────────────────────────────────────────────────
import { getAudioBuffer } from './tts'

// Gemini TTS 輸出格式（與 tts.js 一致）
const SAMPLE_RATE    = 24000
const CHANNELS       = 1
const BITS           = 16
const BYTES_PER_SEC  = SAMPLE_RATE * CHANNELS * (BITS / 8)  // 48000 bytes/sec

// ─── Sprite 專用 IndexedDB ─────────────────────────────────────────────────────
const SPRITE_IDB_NAME = 'dutch-sprite-v1'
const SPRITE_STORE    = 'sprites'
let _spriteDbPromise  = null

function openSpriteDB() {
  if (_spriteDbPromise) return _spriteDbPromise
  _spriteDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(SPRITE_IDB_NAME, 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(SPRITE_STORE)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = () => { _spriteDbPromise = null; reject(req.error) }
  })
  return _spriteDbPromise
}

async function spriteGet(key) {
  try {
    const db = await openSpriteDB()
    return new Promise((resolve) => {
      const req = db.transaction(SPRITE_STORE, 'readonly').objectStore(SPRITE_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => resolve(null)
    })
  } catch { return null }
}

async function spriteSet(key, value) {
  try {
    const db = await openSpriteDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SPRITE_STORE, 'readwrite')
      tx.objectStore(SPRITE_STORE).put(value, key)
      tx.oncomplete = resolve
      tx.onerror    = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[Sprite] write failed:', e)
  }
}

// ─── PCM 工具函式 ──────────────────────────────────────────────────────────────

/** 建立指定秒數的靜音 PCM（全零位元組） */
function createSilencePCM(seconds) {
  return new Uint8Array(Math.round(seconds * BYTES_PER_SEC))
}

/** 從 WAV ArrayBuffer 中擷取原始 PCM（跳過 44 byte header） */
function wavToPCM(wavArrayBuffer) {
  return new Uint8Array(wavArrayBuffer, 44)
}

/** 計算 PCM 位元組對應的秒數 */
function bytesToSeconds(byteLength) {
  return byteLength / BYTES_PER_SEC
}

/** 將多個 PCM Uint8Array 合併成一個完整的 WAV ArrayBuffer */
function buildWAV(pcmChunks) {
  const totalPCM = pcmChunks.reduce((s, c) => s + c.byteLength, 0)
  const buf  = new ArrayBuffer(44 + totalPCM)
  const view = new DataView(buf)
  const wr   = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }

  wr(0,  'RIFF'); view.setUint32(4,  36 + totalPCM,  true)
  wr(8,  'WAVE'); wr(12, 'fmt ')
  view.setUint32(16, 16,           true)  // PCM chunk size
  view.setUint16(20, 1,            true)  // PCM format
  view.setUint16(22, CHANNELS,     true)
  view.setUint32(24, SAMPLE_RATE,  true)
  view.setUint32(28, BYTES_PER_SEC,true)
  view.setUint16(32, CHANNELS * (BITS / 8), true)
  view.setUint16(34, BITS,         true)
  wr(36, 'data'); view.setUint32(40, totalPCM, true)

  const out = new Uint8Array(buf)
  let offset = 44
  for (const chunk of pcmChunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return buf
}

// ─── 公開 API ──────────────────────────────────────────────────────────────────

/**
 * 檢查指定 tab 的 sprite 是否已存在
 */
export async function hasSprite(tabId) {
  const entry = await spriteGet(tabId)
  return entry !== null
}

/**
 * 從 IndexedDB 取得 sprite
 * @returns {{ wavBuffer: ArrayBuffer, timestamps: Array, totalDuration: number } | null}
 */
export async function getSprite(tabId) {
  return await spriteGet(tabId)
}

/** 判斷 TTS 錯誤是否值得重試（429 / quota / 5xx） */
export function isRetryableTtsError(err) {
  const msg = err?.message || ''
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return true
  // 只匹配獨立的 HTTP 5xx 狀態碼，避免誤判含數字「5」的一般訊息
  if (/\b5\d{2}\b/.test(msg)) return true
  return false
}

/**
 * 可被 cancelRef 中斷的等待；若被取消回傳 false
 */
async function cancellableSleep(ms, cancelRef) {
  const step = 200
  let left = ms
  while (left > 0) {
    if (cancelRef?.current) return false
    const slice = Math.min(step, left)
    await new Promise(res => setTimeout(res, slice))
    left -= slice
  }
  return !cancelRef?.current
}

/**
 * 帶指數退避的重試版 getAudioBuffer
 * 遇到 429 或 5xx 時最多重試 4 次，每次等待時間倍增
 */
async function retryGetAudioBuffer(text, cancelRef) {
  const MAX_RETRIES = 4
  let delay = 5000  // 初始等 5 秒

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (cancelRef?.current) return null
    try {
      return await getAudioBuffer(text)
    } catch (err) {
      if (!isRetryableTtsError(err) || attempt === MAX_RETRIES) throw err

      console.warn(`[Sprite] 請求失敗（${err.message?.slice(0, 60)}），${delay / 1000}s 後重試…`)
      const ok = await cancellableSleep(delay, cancelRef)
      if (!ok) return null
      delay *= 2  // 指數退避：5s → 10s → 20s → 40s
    }
  }
}

/**
 * 生成並儲存一個 tab 的完整音檔 sprite
 *
 * @param {string}   tabId      - tab 識別碼（'qa'|'photo'|'comparison'|'story'）
 * @param {Array}    questions  - [{ promptNl, answerNl }, ...]
 * @param {function} onProgress - (done: number, total: number) => void
 * @param {object}   cancelRef  - React ref，{ current: boolean }，設為 true 時中斷
 * @returns {object|null} sprite entry，若被取消則回傳 null
 */
export async function generateSprite(tabId, questions, onProgress, cancelRef) {
  const pcmChunks  = []
  const timestamps = []
  let   cursor     = 0   // 目前累積秒數
  const total      = questions.length * 2  // 每題有題目 + 答案

  try {
    for (let i = 0; i < questions.length; i++) {
      if (cancelRef?.current) return null

      const q = questions[i]

      // ── 1. 題目音訊 ──────────────────────────────────────────────────
      const qWav = await retryGetAudioBuffer(q.promptNl, cancelRef)
      if (cancelRef?.current || !qWav) return null

      const qPcm  = wavToPCM(qWav)
      const qDur  = bytesToSeconds(qPcm.byteLength)
      const qStart = cursor

      pcmChunks.push(qPcm)
      cursor += qDur
      onProgress?.(i * 2 + 1, total)

      // ── 2. 靜音 5 秒（讓用戶思考）────────────────────────────────────
      pcmChunks.push(createSilencePCM(5))
      cursor += 5

      // ── 3. 答案音訊（請求前先等 400ms，避免觸發限速）────────────────
      if (!(await cancellableSleep(400, cancelRef))) return null

      const aWav  = await retryGetAudioBuffer(q.answerNl, cancelRef)
      if (cancelRef?.current || !aWav) return null

      const aPcm  = wavToPCM(aWav)
      const aDur  = bytesToSeconds(aPcm.byteLength)
      const aStart = cursor

      pcmChunks.push(aPcm)
      cursor += aDur
      onProgress?.(i * 2 + 2, total)

      timestamps.push({
        index:         i,
        questionStart: qStart,
        questionEnd:   qStart + qDur,
        answerStart:   aStart,
        answerEnd:     aStart + aDur,
      })

      // ── 4. 題目間停頓 1.5 秒 + 請求間隔 ─────────────────────────────
      if (i < questions.length - 1) {
        pcmChunks.push(createSilencePCM(1.5))
        cursor += 1.5
        // 每題之間也等 400ms，讓 API 喘口氣
        if (!(await cancellableSleep(400, cancelRef))) return null
      }
    }
  } catch (err) {
    console.error('[Sprite] 生成失敗：', err.message)
    // 回傳 null 讓 UI 顯示失敗狀態，而不是卡住
    return null
  }

  if (cancelRef?.current) return null

  const wavBuffer = buildWAV(pcmChunks)
  const entry = {
    wavBuffer,
    timestamps,
    totalDuration: cursor,
    tabId,
    generatedAt: Date.now(),
  }

  await spriteSet(tabId, entry)
  return entry
}

/**
 * 從 sprite entry 建立一個可播放的 Audio 物件和 Blob URL
 * 呼叫端負責在完成後呼叫 URL.revokeObjectURL(url)
 */
export function createSpriteAudio(spriteEntry) {
  const blob = new Blob([spriteEntry.wavBuffer], { type: 'audio/wav' })
  const url  = URL.createObjectURL(blob)
  return { audio: new Audio(url), url, timestamps: spriteEntry.timestamps, totalDuration: spriteEntry.totalDuration }
}

/**
 * 根據播放時間和 timestamps 判斷目前播到第幾題、什麼階段
 */
export function getCurrentInfo(playTime, timestamps) {
  if (!timestamps?.length) return null
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i]
    if (playTime < t.questionEnd)  return { index: i, phase: 'question' }
    if (playTime < t.answerStart)  return { index: i, phase: 'waiting'  }
    if (playTime <= t.answerEnd)   return { index: i, phase: 'answer'   }
  }
  return { index: timestamps.length - 1, phase: 'answer' }
}
