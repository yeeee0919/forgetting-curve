/**
 * 單字卡 lemma / forms 正規化，以及依原形合併匯入
 */

import { generateId } from './storage'
import { initCard, lapseToRelearning, STATUS } from './srs'
import { sanitizeRoots } from './wordUtils'

const FORM_LABELS = ['完成分詞', '比較級', '最高級', '原形', '複數', '小稱', '現在', '過去', '原級']

export function parseFormEntry(entry) {
    if (entry && typeof entry === 'object') {
        const label = String(entry.label || '').trim()
        const value = String(entry.value || entry.word || '').trim()
        return { label, value }
    }
    const raw = String(entry || '').trim()
    if (!raw) return { label: '', value: '' }
    for (const label of FORM_LABELS) {
        if (raw.startsWith(label + ' ') || raw.startsWith(label + '\u3000')) {
            return { label, value: raw.slice(label.length).trim() }
        }
    }
    return { label: '', value: raw }
}

export function normalizeForms(forms) {
    if (!Array.isArray(forms)) return []
    const out = []
    const seen = new Set()
    for (const f of forms) {
        const { label, value } = parseFormEntry(f)
        if (!value) continue
        const key = value.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(label ? `${label} ${value}` : value)
        if (out.length >= 5) break
    }
    return out
}

export function formSpellings(forms = []) {
    return forms.map(f => parseFormEntry(f).value.toLowerCase().trim()).filter(Boolean)
}

export function lemmaKey(card) {
    return String(card?.lemma || card?.front || '').toLowerCase().trim()
}

export function knownSpellings(card) {
    const set = new Set()
    for (const s of [card.front, card.lemma, ...formSpellings(card.forms)]) {
        const k = String(s || '').toLowerCase().trim()
        if (k) set.add(k)
    }
    return set
}

export function cardsMatch(existing, incoming) {
    const eKey = lemmaKey(existing)
    const iKey = lemmaKey(incoming)
    if (eKey && iKey && eKey === iKey) return true
    const eSpell = knownSpellings(existing)
    for (const s of knownSpellings(incoming)) {
        if (eSpell.has(s)) return true
    }
    return false
}

export function hasNewSpelling(existing, incoming) {
    const known = knownSpellings(existing)
    for (const s of knownSpellings(incoming)) {
        if (s && !known.has(s)) return true
    }
    return false
}

export function mergeForms(existing, incoming) {
    const out = normalizeForms(existing.forms)
    const seen = new Set(formSpellings(out))
    for (const f of normalizeForms(incoming.forms)) {
        const sp = parseFormEntry(f).value.toLowerCase()
        if (!sp || seen.has(sp)) continue
        out.push(f)
        seen.add(sp)
    }
    return out.slice(0, 8)
}

export function toCardContent(p) {
    const front = String(p.front || '').trim()
    return {
        front,
        back: p.back || '',
        lemma: String(p.lemma || front).trim(),
        forms: normalizeForms(p.forms),
        phonetic: p.phonetic || '',
        part_of_speech: p.part_of_speech || '',
        example_1: p.example_1 || p.example || '',
        example_trans_1: p.example_trans_1 || p.example_trans || '',
        example_2: p.example_2 || '',
        example_trans_2: p.example_trans_2 || '',
        language: 'nl',
        tips: p.tips || null,
        roots: sanitizeRoots(p.roots, front),
    }
}

function fillIfEmpty(existingVal, incomingVal) {
    if (existingVal == null || existingVal === '') return incomingVal || existingVal
    if (Array.isArray(existingVal) && existingVal.length === 0) return incomingVal || existingVal
    return existingVal
}

export function enrichExisting(existing, incoming) {
    return {
        ...existing,
        lemma: existing.lemma || incoming.lemma || existing.front,
        forms: mergeForms(existing, incoming),
        back: fillIfEmpty(existing.back, incoming.back),
        phonetic: fillIfEmpty(existing.phonetic, incoming.phonetic),
        part_of_speech: fillIfEmpty(existing.part_of_speech, incoming.part_of_speech),
        example_1: fillIfEmpty(existing.example_1 || existing.example, incoming.example_1),
        example_trans_1: fillIfEmpty(existing.example_trans_1 || existing.example_trans, incoming.example_trans_1),
        example_2: fillIfEmpty(existing.example_2, incoming.example_2),
        example_trans_2: fillIfEmpty(existing.example_trans_2, incoming.example_trans_2),
        tips: fillIfEmpty(existing.tips, incoming.tips),
        roots: (existing.roots && existing.roots.length)
            ? existing.roots
            : (incoming.roots || existing.roots),
    }
}

function ensureNewCard(content) {
    if (content.id && content.status) return { ...content, language: 'nl' }
    return {
        id: content.id || generateId(),
        ...toCardContent(content),
        createdAt: content.createdAt || Date.now(),
        ...initCard(),
    }
}

/**
 * 依 lemma（舊卡則退回 front）合併匯入。
 * 若出現舊卡還沒有的新詞形，且舊卡已在熟練區，則送進重學。
 */
export function mergeIncomingCards(existingCards, incomingCards) {
    const incomingList = []
    for (const raw of incomingCards || []) {
        const content = raw.front ? { ...raw, ...toCardContent(raw) } : toCardContent(raw)
        if (!content.front) continue

        const dupIndex = incomingList.findIndex(c => cardsMatch(c, content))
        if (dupIndex >= 0) {
            incomingList[dupIndex] = {
                ...incomingList[dupIndex],
                ...enrichExisting(incomingList[dupIndex], content),
                front: incomingList[dupIndex].front,
            }
        } else {
            incomingList.push(content)
        }
    }

    let added = 0
    let updated = 0
    let relearned = 0
    const taken = new Set()

    const next = existingCards.map(existing => {
        const idx = incomingList.findIndex((incoming, i) => !taken.has(i) && cardsMatch(existing, incoming))
        if (idx === -1) return existing
        taken.add(idx)
        updated++
        const incoming = incomingList[idx]
        const newSpelling = hasNewSpelling(existing, incoming)
        let merged = enrichExisting(existing, incoming)
        if (newSpelling && existing.status === STATUS.REVIEW) {
            merged = lapseToRelearning(merged)
            relearned++
        }
        return merged
    })

    const brandNew = []
    incomingList.forEach((incoming, i) => {
        if (taken.has(i)) return
        brandNew.push(ensureNewCard(incoming))
        added++
    })

    return { cards: [...next, ...brandNew], added, updated, relearned }
}
