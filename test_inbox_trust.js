import { isTrustedInboxEvent, sanitizeInboxItem, sanitizeSourceUrl, mergeInboxItems } from './src/services/inbox.js'

let failed = 0
function assert(cond, msg) {
    if (!cond) {
        failed++
        console.error('FAIL:', msg)
    } else {
        console.log('ok:', msg)
    }
}

const origin = 'https://forgetting-curve-ten.vercel.app'
const good = {
    origin,
    data: { source: 'toocheep-word-catcher', type: 'inbox-flush', items: [{ word: 'fiets' }] },
}

assert(isTrustedInboxEvent(good, origin) === true, '同源 inbox-flush 接受')
assert(isTrustedInboxEvent({ ...good, origin: 'https://evil.example' }, origin) === false, '不同 origin 拒絕')
assert(isTrustedInboxEvent({ origin, data: { source: 'evil', type: 'inbox-flush' } }, origin) === false, '假 source 拒絕')
assert(isTrustedInboxEvent({ origin, data: { source: 'toocheep-word-catcher', type: 'ready' } }, origin) === false, '非 flush 拒絕')
assert(isTrustedInboxEvent(null, origin) === false, '空事件拒絕')

assert(sanitizeSourceUrl('javascript:alert(1)') === null, 'javascript URL 丟掉')
assert(sanitizeSourceUrl('https://nos.nl/artikel')?.startsWith('https://nos.nl/') === true, 'https URL 保留')
assert(sanitizeInboxItem({ word: '', context_sentence: 'x' }) === null, '沒有單字丟掉')
assert(sanitizeInboxItem({ word: '  fiets  ', translation: 't'.repeat(500), source_url: 'http://x.test/a' }).word === 'fiets', '單字 trim')
assert(sanitizeInboxItem({ word: 'fiets', translation: 't'.repeat(500) }).translation.length === 200, '譯文截斷')

const merged = mergeInboxItems([], [{ word: 'fiets', source_url: 'javascript:alert(1)' }])
assert(merged.length === 1 && merged[0].source_url === null, 'merge 時清掉危險 URL')
assert(mergeInboxItems([], [{ word: '' }]).length === 0, '空單字不進 inbox')

if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
}
console.log('\nall passed')
