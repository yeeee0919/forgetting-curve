/**
 * 從 speakingQuestions.js 提取所有需要發音的荷蘭語片段
 * 輸出格式：{ hash: string, text: string }[]
 */
const { qaQuestions, photoQuestions, comparisonQuestions, storyQuestions } =
  require('../src/data/speakingQuestions.js')
const crypto = require("crypto")
const fs     = require("fs")
const path   = require("path")

function textToHash(text) {
  return crypto.createHash('md5').update(text).digest('hex').slice(0, 16)
}

const phrases = new Map()  // hash → text，避免重複

function add(text) {
  if (!text || !text.trim()) return
  const t = text.trim()
  const h = textToHash(t)
  phrases.set(h, t)
}

// QA 題：合併例句+問題（同 SpeakingLab.jsx）& 答案
for (const q of qaQuestions) {
  add(`${q.exampleSentenceNl} ${q.promptNl}`)
  add(q.answerNl)
}

// 圖片描述題
for (const q of photoQuestions) {
  add(q.promptNl)
  add(q.answerNl)
}

// 對比選擇題
for (const q of comparisonQuestions) {
  add(q.promptNl)
  add(q.answerNl)
}

// 看圖講故事題
for (const q of storyQuestions) {
  add(q.promptNl)
  add(q.answerNl)
}

const list = [...phrases.entries()].map(([hash, text]) => ({ hash, text }))
console.error(`共 ${list.length} 個不重複片段`)

// 輸出到 scripts/phrases.json
const outputPath = path.join(__dirname, 'phrases.json')
fs.writeFileSync(outputPath, JSON.stringify(list, null, 2), 'utf8')
console.error(`已寫入 ${outputPath}`)

// 同時輸出 manifest（hash → 相對音檔路徑），供 tts.js 使用
const manifest = {}
for (const { hash } of list) {
  manifest[hash] = `/audio/${hash}.mp3`
}
const manifestPath = path.join(__dirname, '../public/audio/manifest.json')
fs.mkdirSync(path.join(__dirname, '../public/audio'), { recursive: true })
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.error(`manifest 已寫入 public/audio/manifest.json`)
