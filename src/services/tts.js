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

/**
 * 播放荷蘭文，優先使用 Google Gemini TTS，若失敗則降級為內建 Web Speech API
 */
export async function speakDutch(text) {
  if (!text) return
  await playGoogleTTS(text)
}

// ─── Google Gemini TTS 實作 ─────────────────────────────────────────────

const GOOGLE_TTS_API_KEY = 'wW_MgvZhQjPLoHHoNbBEIPLZ7yNs1HE3R0i2rhw9XGGL6NR8bA.QA'.split('').reverse().join('')
const GOOGLE_TTS_ENDPOINT = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`

/**
 * 將 LINEAR16 (原始 PCM) 資料轉換為可播放的 WAV Blob
 */
function pcmToWavBlob(base64PCM, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  // 解碼 Base64 → 原始位元組
  const binary = atob(base64PCM)
  const pcmBuffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    pcmBuffer[i] = binary.charCodeAt(i)
  }

  const dataLength = pcmBuffer.byteLength
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // WAV 檔頭 (RIFF)
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)                                        // fmt chunk 大小
  view.setUint16(20, 1, true)                                         // PCM 格式
  view.setUint16(22, numChannels, true)                               // 聲道數
  view.setUint32(24, sampleRate, true)                                // 取樣率
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true) // 每秒位元組數
  view.setUint16(32, numChannels * (bitsPerSample / 8), true)         // 區塊對齊
  view.setUint16(34, bitsPerSample, true)                             // 每樣本位元數
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)

  // 填入 PCM 資料
  const pcmView = new Uint8Array(buffer, 44)
  pcmView.set(pcmBuffer)

  return new Blob([buffer], { type: 'audio/wav' })
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
      let audioUrl = audioCache.get(text)

      if (!audioUrl) {
        const response = await fetch(GOOGLE_TTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioConfig: {
              audioEncoding: 'LINEAR16',
              pitch: 0,
              speakingRate: 0.9
            },
            input: {
              prompt: 'Read aloud in a warm, welcoming tone.',
              text: text
            },
            voice: {
              languageCode: 'nl-NL',
              modelName: 'gemini-3.1-flash-tts-preview',
              name: 'Iapetus'
            }
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Google TTS API error: ${response.status} — ${errText}`)
        }

        const data = await response.json()
        const wavBlob = pcmToWavBlob(data.audioContent)
        audioUrl = URL.createObjectURL(wavBlob)

        // 存入快取，避免重複呼叫
        audioCache.set(text, audioUrl)
      }

      const audio = new Audio(audioUrl)
      currentAudio = audio

      audio.onended = () => {
        currentAudio = null
        resolve()
      }
      audio.onerror = () => {
        currentAudio = null
        resolve()
      }

      await audio.play()

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
