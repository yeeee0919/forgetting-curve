/**
 * AI 導入服務 - 使用 OpenAI GPT-4o-mini
 * 解析貼入的文字並產生結構化單字卡
 */

import { SYSTEM_PROMPT, ALCHEMIST_SYSTEM_PROMPT } from './cardPrompt'
import { parseCardsJson, parseSingleCardJson } from './jsonImport'

/**
 * 呼叫 OpenAI API 解析文字並回傳卡片陣列
 * @param {string} text - 貼入的原始文字
 * @param {string} apiKey - OpenAI API Key
 * @returns {Promise<Array>} 解析後的卡片陣列
 */
export async function parseTextToCards(text, apiKey) {
  if (!apiKey) throw new Error('請先在設定中輸入 OpenAI API Key')
  if (!text.trim()) throw new Error('請先輸入要匯入的文字')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API 錯誤 (${response.status})`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || '[]'
  return parseCardsJson(content)
}

/**
 * 呼叫 Google Gemini API 解析文字並回傳卡片陣列
 * @param {string} text - 貼入的原始文字
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<Array>} 解析後的卡片陣列
 */
export async function parseTextToCardsGemini(text, apiKey) {
  if (!apiKey) throw new Error('請先在設定中輸入 Gemini API Key')
  if (!text.trim()) throw new Error('請先輸入要匯入的文字')

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT + "\n\n以下是使用者提供的單字列表：\n" + text }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API 錯誤 (${response.status})`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  return parseCardsJson(content)
}

/**
 * 專為 Word Catcher 擴充功能 Inbox 設計的 AI 鍊金術
 */
export async function parseTempInboxItemToCardGemini(word, context, apiKey, hint = "") {
  if (!apiKey) throw new Error('請先在設定中輸入 Gemini API Key')
  if (!word.trim()) throw new Error('單字不能為空')

  const userPrompt = `目標單字：${word}\n原始語境：${context || "無"}\n字典參考翻譯：${hint || "無"}`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: ALCHEMIST_SYSTEM_PROMPT + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2, // 降低 temperature 增加翻譯的一致性與精準度
        responseMimeType: "application/json"
      }
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API 錯誤 (${response.status})`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  return parseSingleCardJson(content)
}
