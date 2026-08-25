import {
    AI_INPUT_LIMITS,
    allowAiRate,
    bodyTooLarge,
    payloadTooLarge,
    readInboxInput,
    readImportText,
    resetAiRateLimit,
} from './api/_lib/aiGuard.js'

let failed = 0
function assert(cond, msg) {
    if (!cond) {
        failed++
        console.error('FAIL:', msg)
    } else {
        console.log('ok:', msg)
    }
}

assert(readInboxInput({}).ok === false, 'inbox 空單字拒絕')
assert(readInboxInput({ word: 'x'.repeat(AI_INPUT_LIMITS.word + 1) }).ok === false, 'inbox 單字過長拒絕')
assert(readInboxInput({ word: 'fiets', context: 'c'.repeat(AI_INPUT_LIMITS.context + 1) }).ok === false, 'inbox 語境過長拒絕')
assert(readInboxInput({ word: 'fiets', hint: 'h'.repeat(AI_INPUT_LIMITS.hint + 1) }).ok === false, 'inbox 提示過長拒絕')
assert(readInboxInput({ word: 'fiets', context: 'Ik heb een fiets.', hint: '腳踏車' }).ok === true, 'inbox 正常輸入通過')

assert(readImportText({}).ok === false, '匯入空文字拒絕')
assert(readImportText({ text: 't'.repeat(AI_INPUT_LIMITS.text + 1) }).ok === false, '匯入過長拒絕')
assert(readImportText({ text: 'fiets\nauto' }).ok === true, '匯入正常通過')

assert(payloadTooLarge(AI_INPUT_LIMITS.bodyBytes + 1) === true, 'content-length 超限')
assert(payloadTooLarge(100) === false, 'content-length 正常')
assert(bodyTooLarge({ text: 'x'.repeat(AI_INPUT_LIMITS.bodyBytes) }) === true, 'JSON body 超限')
assert(bodyTooLarge({ word: 'fiets' }) === false, 'JSON body 正常')

resetAiRateLimit()
const now = 1_700_000_000_000
for (let i = 0; i < AI_INPUT_LIMITS.ratePerMinute; i++) {
    assert(allowAiRate('user-a', now + i) === true, `第 ${i + 1} 次通過`)
}
assert(allowAiRate('user-a', now + 20) === false, '同窗超過次數拒絕')
assert(allowAiRate('user-b', now + 20) === true, '不同使用者互不佔額')
assert(allowAiRate('user-a', now + 60_001) === true, '視窗過後恢復')

if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
}
console.log('\nall passed')
