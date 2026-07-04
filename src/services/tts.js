// ──────────────────────────────────────────────────────────────────────────────
// Dutch TTS Service
// Primary : Google Gemini TTS API  (with IndexedDB persistent cache)
// Fallback : Browser Web Speech API
//
// 快取策略：每個荷蘭語片段在首次播放後，會以 WAV ArrayBuffer 形式
//           永久存入 IndexedDB。之後的每次播放都直接讀快取，不消耗任何
//           API 額度（免費 10 次/天 的限制幾乎不會被感覺到）。
// ──────────────────────────────────────────────────────────────────────────────

// ─── 瀏覽器語音快取 ────────────────────────────────────────────────────────────
let cachedVoices = []
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

// 追蹤目前的播放，方便中斷
let currentAudio = null

// ─── IndexedDB 永久快取 ────────────────────────────────────────────────────────
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
const GEMINI_KEY      = import.meta.env.VITE_GOOGLE_TTS_KEY
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent'

/**
 * 將 Gemini 回傳的 Base64 LINEAR16 PCM 資料轉換為 WAV Blob
 */
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
  view.setUint32(16, 16, true)                                         // fmt chunk 大小
  view.setUint16(20, 1,  true)                                         // PCM 格式
  view.setUint16(22, numChannels, true)                                 // 聲道數
  view.setUint32(24, sampleRate, true)                                  // 取樣率
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true) // 每秒位元組數
  view.setUint16(32, numChannels * (bitsPerSample / 8), true)           // 區塊對齊
  view.setUint16(34, bitsPerSample, true)                               // 每樣本位元數
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)

  const pcmView = new Uint8Array(buffer, 44)
  pcmView.set(pcmBuffer)

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * 從 Gemini TTS API 抓取音訊，成功後自動寫入 IndexedDB 永久快取
 * @returns {string} Blob URL
 */
async function fetchAndCacheGeminiTTS(text) {
  if (!GEMINI_KEY) throw new Error('[TTS] No API key (VITE_GOOGLE_TTS_KEY not set)')

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

  // 轉 WAV → 存 IndexedDB → 回傳 Blob URL
  const wavBlob = pcmToWavBlob(audioB64)
  const arrBuf  = await wavBlob.arrayBuffer()
  await idbSet(text, arrBuf)

  return URL.createObjectURL(wavBlob)
}

/**
 * 取得音訊 URL：優先查 IndexedDB 快取，沒有才打 Gemini API
 */
async function getAudioUrl(text) {
  // 1. 查 IndexedDB 永久快取（不消耗 API 額度）
  const cached = await idbGet(text)
  if (cached) {
    return URL.createObjectURL(new Blob([cached], { type: 'audio/wav' }))
  }

  // 2. 呼叫 Gemini TTS API（首次才需要消耗 1 次額度）
  return await fetchAndCacheGeminiTTS(text)
}

// ─── 核心播放邏輯 ──────────────────────────────────────────────────────────────

async function playGeminiTTS(text) {
  // 如果正在播放，先中斷
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
      console.error('[TTS] Gemini 播放失敗，降級為內建語音', err)
      await playBrowserTTS(text)
      resolve()
    }
  })
}

// ─── 瀏覽器內建 Web Speech API（備用）────────────────────────────────────────

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

    utterance.onend  = () => resolve()
    utterance.onerror = (e) => resolve(e)

    window.__speechUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * 播放荷蘭文文字
 * 流程：IndexedDB 快取 → Gemini TTS API → 瀏覽器內建語音
 */
export async function speakDutch(text) {
  if (!text) return
  await playGeminiTTS(text)
}

/**
 * 預先載入發音並存入 IndexedDB，但不播放
 * 若已有快取則直接跳過（不消耗 API 額度）
 */
export async function preloadDutch(text) {
  if (!text) return
  const cached = await idbGet(text)
  if (cached) return
  try {
    await fetchAndCacheGeminiTTS(text)
  } catch (err) {
    // 預載失敗不影響播放流程
    console.warn('[TTS] Preload failed:', err.message)
  }
}

/**
 * 停止所有語音播放（Gemini WAV + Web Speech API）
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
