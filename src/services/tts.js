import { getSettings } from './storage'

// 記憶體快取，避免重複呼叫消耗額度
const audioCache = new Map()

// 瀏覽器內建 TTS 快取
let cachedVoices = []
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

/**
 * 播放荷蘭文，優先使用 ElevenLabs API，若無金鑰則使用內建 Web Speech API
 */
export async function speakDutch(text) {
  if (!text) return

  const settings = getSettings()
  const apiKey = settings.elevenLabsKey?.trim()

  // 如果有設定 ElevenLabs API Key，使用 ElevenLabs
  if (apiKey) {
    await playElevenLabs(text, apiKey)
  } else {
    // 退回瀏覽器內建發音
    await playBrowserTTS(text)
  }
}

// ─── ElevenLabs 實作 ──────────────────────────────────────────────────

// 追蹤目前的播放，方便中斷
let currentAudio = null

async function playElevenLabs(text, apiKey) {
  // 如果正在播放，先中斷
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  return new Promise(async (resolve, reject) => {
    try {
      let audioUrl = audioCache.get(text)

      if (!audioUrl) {
        // Voice ID (預設使用 Rachel，適合故事與對話)
        const voiceId = '21m00Tcm4TlvDq8ikWAM'
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        })

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        audioUrl = URL.createObjectURL(blob)
        
        // 存入快取
        audioCache.set(text, audioUrl)
      }

      // 建立 audio 元素並播放
      const audio = new Audio(audioUrl)
      currentAudio = audio

      audio.onended = () => {
        currentAudio = null
        resolve()
      }
      
      audio.onerror = (e) => {
        currentAudio = null
        reject(e)
      }

      await audio.play()

    } catch (err) {
      console.error('ElevenLabs 播放失敗，降級為內建語音', err)
      if (err.message.includes('401')) {
        alert('ElevenLabs 播放失敗：API Key 錯誤或無效。將暫時使用瀏覽器內建語音。')
      } else if (err.message.includes('402') || err.message.includes('429')) {
        alert('ElevenLabs 播放失敗：您的免費額度可能已用盡。將暫時使用瀏覽器內建語音。')
      } else {
        alert(`ElevenLabs 播放發生錯誤 (${err.message})。將暫時使用瀏覽器內建語音。`)
      }
      
      // 如果 API 呼叫失敗 (例如額度用盡或 Key 錯誤)，降級為內建
      await playBrowserTTS(text)
      resolve()
    }
  })
}

// ─── 瀏覽器內建 Web Speech API ────────────────────────────────────────

async function playBrowserTTS(text) {
  if (!window.speechSynthesis) return

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
    await new Promise(r => setTimeout(r, 15))
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nl-NL'
    utterance.rate = 0.75  // 放慢語速

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
 * 停止所有語音播放 (包括 ElevenLabs 和 Web Speech)
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
