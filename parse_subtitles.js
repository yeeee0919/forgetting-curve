#!/usr/bin/env node
/**
 * parse_subtitles.js
 * 讀取 chapters.txt 和 raw_subtitles.txt，
 * 生成符合 ListeningLab 所需的 JSON，並直接寫入 src/data/lesson.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** 把 "1:23" 或 "0:05" 或 "1:23:45" 轉成秒 */
function toSec(timeStr) {
    const parts = timeStr.trim().replace(/s$/, '').split(':').map(Number)
    if (parts.length === 1) return parts[0]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

/** 把秒轉成 MM:SS 字串，供 chapter_title 顯示 */
function toMMSS(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

// ── Parse chapters.txt ────────────────────────────────────────────────────────

const chaptersRaw = fs.readFileSync(
    path.join(__dirname, 'chapters.txt'), 'utf8'
).split('\n')

const chapters = []
for (const line of chaptersRaw) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    // format: "0:05 第一題" or "1:29 第三題"
    const match = trimmed.match(/^(\S+)\s+(.+)$/)
    if (!match) continue
    const sec = toSec(match[1])
    const title = match[2].trim()
    chapters.push({ title, start_time: sec })
}

// compute end_time = next chapter's start - 1, last chapter ends at a big number
for (let i = 0; i < chapters.length; i++) {
    chapters[i].end_time = i + 1 < chapters.length
        ? chapters[i + 1].start_time - 1
        : 9999
}

console.log(`✅ 解析章節：${chapters.length} 個`)

// ── Parse raw_subtitles.txt ───────────────────────────────────────────────────

const subsRaw = fs.readFileSync(
    path.join(__dirname, 'raw_subtitles.txt'), 'utf8'
).split('\n')

const sentences = []
for (const line of subsRaw) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed === '***') continue
    // format: "0s\tSubtitle\tTranslation" or "1:23\tSubtitle\tTranslation"
    const parts = trimmed.split('\t')
    if (parts.length < 2) continue
    const timeStr = parts[0].trim()
    const subtitle = parts[1]?.trim()
    const translation = parts[2]?.trim() || ''
    if (!subtitle || subtitle === 'Subtitle' || subtitle === '***') continue
    sentences.push({
        start: toSec(timeStr),
        subtitle,
        translation
    })
}

// compute end of each sentence = start of next - 0.1
for (let i = 0; i < sentences.length; i++) {
    sentences[i].end = i + 1 < sentences.length
        ? sentences[i + 1].start - 0.1
        : sentences[i].start + 5
}

console.log(`✅ 解析字幕句：${sentences.length} 句`)

// ── Assign sentences to chapters & generate word timestamps ──────────────────

function splitIntoWords(subtitle, sentenceStart, sentenceEnd) {
    // Split on spaces, keep punctuation attached to the word before it
    const rawWords = subtitle.split(/\s+/).filter(Boolean)
    const duration = sentenceEnd - sentenceStart
    const perWord = duration / rawWords.length
    return rawWords.map((word, i) => ({
        word,
        start: Math.round((sentenceStart + i * perWord) * 100) / 100,
        end:   Math.round((sentenceStart + (i + 1) * perWord - 0.05) * 100) / 100,
    }))
}

const result = chapters.map((ch, idx) => {
    const inChapter = sentences.filter(
        s => s.start >= ch.start_time && s.start <= ch.end_time
    )
    // Build sentences array
    const sentences_data = inChapter.map(s => {
        return {
            text: s.subtitle,
            translation: s.translation,
            start: s.start,
            end: s.end,
            words: splitIntoWords(s.subtitle, s.start, s.end)
        }
    })

    return {
        chapter_title: `${ch.title} (${toMMSS(ch.start_time)})`,
        start_time: ch.start_time,
        end_time: ch.end_time,
        sentences: sentences_data
    }
})

// ── Write output ─────────────────────────────────────────────────────────────

const outDir  = path.join(__dirname, 'src', 'data')
const outFile = path.join(outDir, 'lesson.json')

fs.mkdirSync(outDir, { recursive: true })

const output = {
    youtube_id: 'Rd80j_yTfAM',
    title: 'Nederlands in gang - Audio',
    chapters: result
}

fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8')

console.log(`\n🎉 已寫入 ${outFile}`)
console.log(`   總章節：${result.length}`)
console.log(`   總單字：${result.reduce((a, c) => a + c.sentences.reduce((sa, sc) => sa + sc.words.length, 0), 0)}`)
