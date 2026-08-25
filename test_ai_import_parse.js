import { readFileSync } from 'node:fs'
import { parseCardsJson, parseSingleCardJson } from './src/services/jsonImport.js'

let failed = 0
function assert(cond, msg) {
    if (!cond) {
        failed++
        console.error('FAIL:', msg)
    } else {
        console.log('ok:', msg)
    }
}

const src = readFileSync(new URL('./api/_lib/handleAiCards.js', import.meta.url), 'utf8')
assert(/from ['"][^'"]*jsonImport\.js['"]/.test(src), 'handleAiCards.js imports jsonImport.js')
assert(/\bparseCardsJson\b/.test(src), 'handleAiCards.js calls parseCardsJson')
assert(/\bparseSingleCardJson\b/.test(src), 'handleAiCards.js calls parseSingleCardJson')
assert(/\breserveThenRun\b/.test(src), 'handleAiCards.js 先扣額度再打模型')
assert(src.indexOf('consumeQuota') < src.indexOf('callOpenAi(['), 'consumeQuota 出現在呼叫模型之前')

const cards = parseCardsJson(JSON.stringify({
    cards: [{ front: 'scheelt', back: '有差別' }, { front: 'slim', back: '聰明' }],
}))
assert(cards.length === 2 && cards[0].front === 'scheelt', 'json_object { cards: [...] } parses')

const single = parseSingleCardJson(JSON.stringify({ front: 'griep', back: '流感' }))
assert(single.front === 'griep', 'single-card json_object parses')

if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
}
console.log('\nall passed')
