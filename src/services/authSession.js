/**
 * 登入狀態還原的純邏輯：不碰 supabase client，方便單測。
 *
 * 背景：supabase-js 在重整時會用 navigator.locks 做 token refresh。
 * lock 還沒拿到、或 refresh 還沒回來時，getSession() / INITIAL_SESSION
 * 可能先丟 null。若 UI 立刻當成登出，就會出現「重整十幾次才突然登入」。
 */

export function authStorageKeyFromUrl(supabaseUrl) {
    const host = new URL(supabaseUrl).hostname
    const ref = host.split('.')[0]
    return `sb-${ref}-auth-token`
}

export function parseStoredSession(raw) {
    if (!raw) return null
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        const session = parsed?.currentSession || parsed
        if (session?.user?.id && (session.access_token || session.refresh_token)) {
            return session
        }
    } catch {
        /* 壞掉的 localStorage */
    }
    return null
}

/**
 * @returns {object|null|undefined} session 要套用的值；undefined = 忽略這次事件
 */
export function resolveAuthEvent(event, incoming, stored) {
    if (incoming?.user?.id) return incoming
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') return null
    if (stored?.user?.id) return stored
    if (event === 'INITIAL_SESSION') return null
    return undefined
}
