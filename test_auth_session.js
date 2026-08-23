import { parseStoredSession, resolveAuthEvent, authStorageKeyFromUrl } from './src/services/authSession.js'

let failed = 0
function assert(cond, msg) {
    if (!cond) {
        failed++
        console.error('FAIL:', msg)
    } else {
        console.log('ok:', msg)
    }
}

const user = { id: 'user-1', email: 'a@b.c' }
const stored = {
    access_token: 'at',
    refresh_token: 'rt',
    user,
    expires_at: 9999999999,
}

assert(
    authStorageKeyFromUrl('https://ttfjdxnasklhealmxgoz.supabase.co') === 'sb-ttfjdxnasklhealmxgoz-auth-token',
    'storage key 由 project ref 組成'
)

assert(parseStoredSession(null) === null, '空值 → null')
assert(parseStoredSession('not-json') === null, '壞 JSON → null')
assert(parseStoredSession(JSON.stringify(stored))?.user?.id === 'user-1', '標準 session JSON')
assert(
    parseStoredSession(JSON.stringify({ currentSession: stored }))?.user?.id === 'user-1',
    '舊版 currentSession 包裝'
)
assert(parseStoredSession(JSON.stringify({ access_token: 'x' })) === null, '沒有 user 不算登入')

assert(resolveAuthEvent('TOKEN_REFRESHED', stored, stored) === stored, '有 incoming 就用 incoming')
assert(resolveAuthEvent('SIGNED_OUT', null, stored) === null, 'SIGNED_OUT 必須登出')
assert(resolveAuthEvent('USER_DELETED', null, stored) === null, 'USER_DELETED 必須登出')
assert(
    resolveAuthEvent('INITIAL_SESSION', null, stored)?.user?.id === 'user-1',
    'INITIAL_SESSION 先丟 null、本機還有 token → 先保留登入'
)
assert(
    resolveAuthEvent('TOKEN_REFRESHED', null, stored)?.user?.id === 'user-1',
    'refresh 過程的空值不可把已登入洗掉'
)
assert(resolveAuthEvent('INITIAL_SESSION', null, null) === null, '沒有本機 token 才是真的訪客')
assert(resolveAuthEvent('USER_UPDATED', null, null) === undefined, '無關的空事件忽略')

if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
}
console.log('\nall passed')
