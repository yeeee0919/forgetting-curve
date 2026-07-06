// ──────────────────────────────────────────────────────────────────────────────
// Dutch TTS Service
// 優先級：靜態音檔（/audio/*.mp3）→ IndexedDB 快取 → Gemini API → 瀏覽器語音
// ──────────────────────────────────────────────────────────────────────────────
import { getSettings } from './storage'

// ─── 靜態音檔 manifest ────────────────────────────────────────────────────────
// manifest.json 格式：{ "<md5-hash>": "/audio/<hash>.mp3" }
let _manifest = null

async function getManifest() {
  if (_manifest) return _manifest
  try {
    const res = await fetch('/audio/manifest.json')
    if (res.ok) {
      _manifest = await res.json()
    } else {
      _manifest = {}
    }
  } catch {
    _manifest = {}
  }
  return _manifest
}

async function textToHash(text) {
  const encoder = new TextEncoder()
  const data    = encoder.encode(text.trim())
  const hashBuf = await crypto.subtle.digest('MD5', data).catch(() => null)
  // 不是所有瀏覽器都支援 MD5，用 FNV-1a 32-bit 作備案
  if (!hashBuf) return fnv1a(text.trim()).toString(16).padStart(8, '0').repeat(2)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

// FNV-1a 備用 hash（瀏覽器不支援 SubtleCrypto MD5 時使用）
function fnv1a(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

async function getStaticAudioUrl(text) {
  const manifest = await getManifest()
  if (Object.keys(manifest).length === 0) return null

  // 用相同的 MD5(text.trim()).slice(0,16) 找音檔
  const hash = await textToHash(text)
  const path = manifest[hash]
  return path || null
}

// ─── 瀏覽器語音快取 ────────────────────────────────────────────────────────────
let cachedVoices = []
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

// 追蹤目前的播放，方便中斷
let currentAudio = null

// ─── IndexedDB 永久快取（給 Gemini 生成的音訊用）────────────────────────────
const IDB_NAME    = 'dutch-tts-cache-v2'
const IDB_STORE   = 'audio'
const IDB_VERSION = 1

let _dbPromise = null

function openIDB() {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = () => { _dbPromise = null; reject(req.error) }
  })
  return _dbPromise
}

async function idbGet(key) {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx  = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function idbSet(key, value) {
  try {
    const db = await openIDB()
    const tx  = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
  } catch (e) {
    console.warn('[TTS Cache] write failed:', e)
  }
}

// ─── Gemini TTS API ───────────────────────────────────────────────────────────
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent'

function getApiKey() {
  return getSettings().geminiKey || import.meta.env.VITE_GOOGLE_TTS_KEY || ''
}

function pcmToWavBlob(base64PCM, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const binary    = atob(base64PCM)
  const pcmBuffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) pcmBuffer[i] = binary.charCodeAt(i)

  const dataLength = pcmBuffer.byteLength
  const buffer     = new ArrayBuffer(44 + dataLength)
  const view       = new DataView(buffer)

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0,  'RIFF')
  view.setUint32(4,  36 + dataLength, true)
  writeStr(8,  'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1,  true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true)
  view.setUint16(32, numChannels * (bitsPerSample / 8), true)
  view.setUint16(34, bitsPerSample, true)
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)

  const pcmView = new Uint8Array(buffer, 44)
  pcmView.set(pcmBuffer)

  return new Blob([buffer], { type: 'audio/wav' })
}

async function fetchAndCacheGeminiTTS(text) {
  const GEMINI_KEY = getApiKey()
  if (!GEMINI_KEY) throw new Error('[TTS] No API key — 請在設定中輸入 Gemini API Key')

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `Read aloud in a warm, welcoming tone in Dutch (Netherlands): ${text}` }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Iapetus' }
          }
        }
      }
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini TTS API error: ${response.status} — ${errText}`)
  }

  const data      = await response.json()
  const audioB64  = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!audioB64) throw new Error('[TTS] Gemini 沒有回傳音訊資料')

  const wavBlob = pcmToWavBlob(audioB64)
  const arrBuf  = await wavBlob.arrayBuffer()
  await idbSet(text, arrBuf)

  return URL.createObjectURL(wavBlob)
}

// ─── 取得音訊 URL（四層優先級）─────────────────────────────────────────────────
async function getAudioUrl(text) {
  // 1. 靜態音檔（最快，從 Vercel CDN 播放）
  const staticUrl = await getStaticAudioUrl(text)
  if (staticUrl) return staticUrl

  // 2. IndexedDB 本機永久快取（Gemini 之前生成過的）
  const cached = await idbGet(text)
  if (cached) {
    return URL.createObjectURL(new Blob([cached], { type: 'audio/wav' }))
  }

  // 3. Gemini TTS API（首次生成，會存入 IndexedDB）
  return await fetchAndCacheGeminiTTS(text)
}

// ─── 核心播放邏輯 ──────────────────────────────────────────────────────────────
async function playTTS(text) {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  return new Promise(async (resolve) => {
    try {
      const audioUrl = await getAudioUrl(text)
      const audio    = new Audio(audioUrl)
      currentAudio   = audio

      audio.onended = () => { currentAudio = null; resolve() }
      audio.onerror = () => { currentAudio = null; resolve() }

      await audio.play()
    } catch (err) {
      console.error('[TTS] 播放失敗，降級為內建語音', err)
      await playBrowserTTS(text)
      resolve()
    }
  })
}

// ─── 瀏覽器內建 Web Speech API（最終備用）────────────────────────────────────
async function playBrowserTTS(text) {
  if (!window.speechSynthesis) return

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
    await new Promise(r => setTimeout(r, 15))
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang  = 'nl-NL'
    utterance.rate  = 0.75

    if (cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices()
    }

    if (cachedVoices.length > 0) {
      const nlVoices  = cachedVoices.filter(v => v.lang.startsWith('nl'))
      const bestVoice = nlVoices.find(v =>
        v.name.includes('Premium')  ||
        v.name.includes('Enhanced') ||
        v.name.includes('Google')   ||
        v.name.includes('Siri')
      )
      if (bestVoice) {
        utterance.voice = bestVoice
      } else if (nlVoices.length > 0) {
        utterance.voice = nlVoices[0]
      }
    }

    utterance.onend   = () => resolve()
    utterance.onerror = (e) => resolve(e)

    window.__speechUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * 播放荷蘭文文字
 * 優先級：靜態音檔 → IndexedDB → Gemini API → 瀏覽器語音
 */
export async function speakDutch(text) {
  if (!text) return
  await playTTS(text)
}

/**
 * 預先載入（目前僅對 Gemini 快取有效，靜態音檔由瀏覽器自行快取）
 */
export async function preloadDutch(text) {
  if (!text) return
  try {
    const staticUrl = await getStaticAudioUrl(text)
    if (staticUrl) return  // 靜態音檔存在，跳過預載
    const cached = await idbGet(text)
    if (cached) return
    await fetchAndCacheGeminiTTS(text)
  } catch (err) {
    console.warn('[TTS] Preload failed:', err.message)
  }
}

/**
 * 停止所有語音播放
 */
export function stopTTS() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (window.speechSynthesis?.speaking) {
    window.speechSynthesis.cancel()
  }
}

/**
 * 取得音訊的原始 WAV ArrayBuffer（供 sprite 合併使用）
 * 優先級：IndexedDB 快取 → Gemini TTS API
 * 注意：跳過靜態音檔（MP3 格式無法直接 PCM 合併）
 */
export async function getAudioBuffer(text) {
  if (!text) return null
  // 先查 IndexedDB（Gemini 生成過的 WAV）
  const cached = await idbGet(text)
  if (cached) return cached  // ArrayBuffer

  // 呼叫 Gemini 生成並快取
  await fetchAndCacheGeminiTTS(text)
  return await idbGet(text)
}

