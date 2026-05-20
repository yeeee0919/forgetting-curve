/**
 * AI 導入服務 - 使用 OpenAI GPT-4o-mini
 * 解析貼入的文字並產生結構化單字卡
 */

const SYSTEM_PROMPT = `你是一位精通語言學、認知心理學與記憶法的語言學教授。
用戶會貼上一段包含單字或詞組的文字（可能是備忘錄、LINE 訊息、或任意格式）。
請解析出所有「學習項目」，每個項目包含：
- front: 原文（要背的那面，通常是外語）
- back: 翻譯/解釋。！！！極度重要！！！絕不能只給單一翻譯。請務必列出該字彙所有的「常見核心意思」與「不同詞性的翻譯」，用「、」分隔，讓學習者能一次掌握全貌。
- part_of_speech: 詞性標註（例如：n. / v. / adj. / adv. / prep. / conj. 等，若無或不確定請留空字串 ""）
- phonetic: 音標（如果可以推斷，否則留空字串）
- example_1: 一個簡單、生活化、高頻使用的例句（用 front 的語言）
- example_trans_1: 例句 1 的中文翻譯
- example_2: 一個稍微進階、帶有不同語意或慣用法、或不同時態的例句（用 front 的語言）
- example_trans_2: 例句 2 的中文翻譯
- language: 語言代碼（如 nl=荷蘭語, en=英語, ja=日語, de=德語）
- tips: 教授級的記憶提示。請嚴格包含以下兩個部分，並使用指定的標籤開頭：
  【字源分析】：拆解字根、字首、字尾，解釋它的歷史或構詞邏輯。若無明顯字根可分析，請說明它的發音規則或詞源來源。
  【生動聯想】：基於發音（諧音）或字形，利用大腦的「荒謬記憶效應（Bizarre Effect）」，創造一個極度生動、甚至有點荒謬的畫面或小故事情境，將外語發音與中文意思強烈連結起來。

回覆格式要求（極度重要）：
!!! 必須回傳純 JSON 格式 !!!
!!! 絕對不要使用任何 Markdown backticks (\`\`\`) 包裝，直接回傳 RAW JSON 文本就好 !!!
!!! 不要包含任何說明文字，確保第一個字元就是 {，最後一個字元就是 } !!!

範例輸出：
{
  "cards": [
    {
      "front": "uiterlijk",
      "back": "外表/外觀 (名詞)、最晚/遲遲 (副詞)",
      "phonetic": "/ˈœy.tər.lək/",
      "example_1": "Ze besteedt veel tijd aan haar uiterlijk.",
      "example_trans_1": "她花很多時間在她的外表上。",
      "example_2": "De betaling moet uiterlijk vrijdag binnen zijn.",
      "example_trans_2": "款項最晚必須在星期五收到。",
      "language": "nl",
      "tips": "【字源分析】：uit (外面) + erlijk (結尾) → 從外在展現出來的 → 外表、最晚的極限。【生動聯想】：想像你「最晚」出門前，都要精心打扮「外表」。"
    }
  ]
}`

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

  // 終極防呆：直接擷取最外層的陣列或物件括號，忽略所有的 Markdown 與多餘文字
  let cleanContent = content
  const firstBracket = cleanContent.search(/[\[\{]/)
  const lastBracket = Math.max(cleanContent.lastIndexOf(']'), cleanContent.lastIndexOf('}'))

  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanContent = cleanContent.slice(firstBracket, lastBracket + 1)
  }

  try {
    const parsed = JSON.parse(cleanContent)
    // 支援回傳 { cards: [...] } 或直接 [...]
    return Array.isArray(parsed) ? parsed : (parsed.cards || parsed.items || [])
  } catch {
    throw new Error('AI 回傳格式錯誤，請重試 (Parsing Failed)')
  }
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

  // 防呆解析
  let cleanContent = content
  const firstBracket = cleanContent.search(/[\[\{]/)
  const lastBracket = Math.max(cleanContent.lastIndexOf(']'), cleanContent.lastIndexOf('}'))

  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanContent = cleanContent.slice(firstBracket, lastBracket + 1)
  }

  try {
    const parsed = JSON.parse(cleanContent)
    return Array.isArray(parsed) ? parsed : (parsed.cards || parsed.items || [])
  } catch {
    throw new Error('AI 回傳格式錯誤，請重試 (Parsing Failed)')
  }
}

/**
 * 專為 Word Catcher 擴充功能 Inbox 設計的 AI 鍊金術專用 Prompt
 */
const ALCHEMIST_SYSTEM_PROMPT = `你是一位精通語言學、認知心理學與記憶法的語言學教授。
用戶會提供一個「目標單字 (Word)」以及這個單字「被捕捉時的原始句子語境 (Context)」。
有時用戶也會提供一個「字典參考翻譯 (Dictionary Hint)」。

請根據這些資訊，精準地解釋這個單字的用法，並生成一張完美的學習閃卡資料。

「翻譯/解釋 (back)」欄位的產生原則（極度重要）：
1. 優先確保解釋符合提供之「原始語境」。
2. 絕對不能只給單一翻譯。請務必列出該字彙所有的「常見核心意思」與「不同詞性的翻譯」，用「、」分隔，讓學習者能一次掌握全貌。
3. 若有提供「字典參考翻譯」，請務必參考並整理其中的多重語意，確保不遺漏重要的詞性變化（如 watch 作為名詞是手錶，作為動詞是觀看）。

請解析並回傳以下欄位：
- front: 目標單字或詞組。
- back: 精準翻譯與多重語意補充。
- part_of_speech: 詞性標註（如：n. / v. / adj. / adv. / prep. / conj. 等，若有多重詞性請標註在一起如 n. / v.）。
- phonetic: 音標。
- example_1: 原汁原味保留用戶提供的原始語境句子（請修正明顯錯誤）。
- example_trans_1: 例句 1 的中文翻譯。
- example_2: 生成一個與原始語境不同語意的「全新例句」，用來展示單字的另一種常見用法或不同詞性，幫助舉一反三。
- example_trans_2: 新例句的中文翻譯。
- language: 語言代碼（如 nl=荷蘭語, en=英語）。
- tips: 記憶提示。包含【字源分析】與【生動聯想】。

回覆格式要求：
!!! 必須回傳純 JSON 格式，不帶 Markdown block (\`\`\`) !!!

範例輸出：
{
  "front": "watch",
  "back": "觀看/監視 (動詞)、手錶 (名詞)",
  "phonetic": "/wɒtʃ/",
  "part_of_speech": "v. / n.",
  "example_1": "I am watching a movie.",
  "example_trans_1": "我正在看電影。",
  "example_2": "He gave me a gold watch.",
  "example_trans_2": "他給了我一支金錶。",
  "language": "en",
  "tips": "【字源分析】：源自古英語 wæccan，意為看守。\\n【生動聯想】：想像你在「觀看」你的「手錶」確認時間。"
}`

/**
 * 針對 Inbox 項目使用 Gemini API 進行 AI 鍊金轉化
 * @param {string} word - 擷取的單字
 * @param {string} context - 擷取時的原始語句
 * @param {string} apiKey - Gemini API Key
 * @param {string} hint - 字典參考翻譯 (從擴充功能傳入)
 * @returns {Promise<Object>} 解析後的單一卡片物件
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

  // 防呆解析
  let cleanContent = content
  const firstBracket = cleanContent.search(/[\[\{]/)
  const lastBracket = Math.max(cleanContent.lastIndexOf(']'), cleanContent.lastIndexOf('}'))

  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanContent = cleanContent.slice(firstBracket, lastBracket + 1)
  }

  try {
    const parsed = JSON.parse(cleanContent)
    return parsed
  } catch {
    throw new Error('AI 回傳格式錯誤，請重試 (Parsing Failed)')
  }
}
