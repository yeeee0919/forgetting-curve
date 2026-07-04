// 記憶體快取，避免重複呼叫消耗額度
const audioCache = new Map()

// 瀏覽器內建 TTS 快取
let cachedVoices = []
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

// 追蹤目前的播放，方便中斷
let currentAudio = null

// 追蹤是否被 Gemini API 限速 (429)
let rateLimitUntil = 0

/**
 * 播放荷蘭文，優先使用 Google Gemini TTS，若失敗則降級為內建 Web Speech API
 */
export async function speakDutch(text) {
  if (!text) return
  await playGoogleTTS(text)
}

/**
 * 預先載入發音，存入快取但不播放
 */
export async function preloadDutch(text) {
  if (!text) return
  if (audioCache.has(text)) return
  await fetchGoogleTTS(text)
}

// ─── Google Translate TTS (Free, No API Key) ─────────────────────────────────────────────

// 將長文本依照標點符號分割，避免超過 Google Translate TTS 的 200 字元限制
function splitTextIntoChunks(text, maxLength = 150) {
  const chunks = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ''
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

async function fetchGoogleTTS(text) {
  // 對於 Google Translate TTS，我們不需要在這裡抓取二進位資料，
  // 因為它可以直接用 URL 播放。但為了配合預載邏輯，我們可以回傳 chunk URLs。
  const chunks = splitTextIntoChunks(text)
  const urls = chunks.map(chunk => 
    `https://translate.google.com/translate_tts?ie=UTF-8&tl=nl-NL&client=tw-ob&q=${encodeURIComponent(chunk)}`
  )
  
  audioCache.set(text, urls)
  return urls
}

async function playGoogleTTS(text) {
  // 如果正在播放，先中斷
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  return new Promise(async (resolve) => {
    try {
      let urls = audioCache.get(text)

      if (!urls) {
        urls = await fetchGoogleTTS(text)
      }

      // 依序播放每個片段
      for (let i = 0; i < urls.length; i++) {
        await new Promise((resolveChunk, rejectChunk) => {
          const audio = new Audio(urls[i])
          currentAudio = audio

          audio.onended = () => {
            currentAudio = null
            resolveChunk()
          }
          audio.onerror = () => {
            currentAudio = null
            rejectChunk(new Error('Audio playback failed'))
          }

          audio.play().catch(rejectChunk)
        })
      }
      
      resolve()
    } catch (err) {
      console.error('Google TTS 播放失敗，降級為內建語音', err)
      await playBrowserTTS(text)
      resolve()
    }
  })
}

// ─── 瀏覽器內建 Web Speech API（備用）────────────────────────────────────

async function playBrowserTTS(text) {
  if (!window.speechSynthesis) return

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
    await new Promise(r => setTimeout(r, 15))
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nl-NL'
    utterance.rate = 0.75

    if (cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices()
    }

    if (cachedVoices.length > 0) {
      const nlVoices = cachedVoices.filter(v => v.lang.startsWith('nl'))
      const bestVoice = nlVoices.find(v =>
        v.name.includes('Premium') ||
        v.name.includes('Enhanced') ||
        v.name.includes('Google') ||
        v.name.includes('Siri')
      )
      if (bestVoice) {
        utterance.voice = bestVoice
      } else if (nlVoices.length > 0) {
        utterance.voice = nlVoices[0]
      }
    }

    utterance.onend = () => resolve()
    utterance.onerror = (e) => resolve(e)

    window.__speechUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

/**
 * 停止所有語音播放 (包括 Google TTS 和 Web Speech)
 */
export function stopTTS() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
  }
}
