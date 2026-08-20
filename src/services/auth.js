import { supabase } from './supabase'
import { CHROME_EXTENSION_ID } from '../config/extension'

export function syncSessionToExtension(session) {
    const runtime = window.chrome?.runtime
    if (!runtime?.sendMessage || !CHROME_EXTENSION_ID) return
    try {
        runtime.sendMessage(
            CHROME_EXTENSION_ID,
            session
                ? {
                    type: 'toocheep-auth',
                    accessToken: session.access_token,
                    refreshToken: session.refresh_token,
                    userId: session.user?.id,
                    expiresAt: session.expires_at,
                }
                : { type: 'toocheep-logout' },
            () => void runtime.lastError
        )
    } catch {
        /* 沒裝擴充功能 */
    }
}

export function ackExtensionQueue(ids) {
    const runtime = window.chrome?.runtime
    if (!runtime?.sendMessage || !CHROME_EXTENSION_ID || !ids?.length) return
    try {
        runtime.sendMessage(
            CHROME_EXTENSION_ID,
            { type: 'toocheep-ack-queue', ids },
            () => void runtime.lastError
        )
    } catch {
        /* ignore */
    }
}

/** 向擴充功能／content script 再要一次 Catch 佇列（避免頁面還沒掛好監聽就送完） */
export function requestExtensionInboxFlush() {
    try {
        window.postMessage({ source: 'toocheep-app', type: 'request-inbox-flush' }, '*')
    } catch {
        /* ignore */
    }
    const runtime = window.chrome?.runtime
    if (!runtime?.sendMessage || !CHROME_EXTENSION_ID) return
    try {
        runtime.sendMessage(CHROME_EXTENSION_ID, { type: 'toocheep-peek-queue' }, (res) => {
            if (runtime.lastError) return
            const items = res?.items || []
            if (!items.length) return
            try {
                window.postMessage(
                    { source: 'toocheep-word-catcher', type: 'inbox-flush', items },
                    '*'
                )
            } catch {
                /* ignore */
            }
        })
    } catch {
        /* ignore */
    }
}

export function subscribeAuth(onSession) {
    supabase.auth.getSession().then(({ data }) => {
        onSession(data.session || null)
        if (data.session) syncSessionToExtension(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        onSession(session || null)
        syncSessionToExtension(session)
    })
    return () => subscription.unsubscribe()
}

export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
    })
    if (error) throw error
}

export async function signOutUser() {
    syncSessionToExtension(null)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}
