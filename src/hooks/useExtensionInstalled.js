import { useEffect, useState } from 'react'
import { CHROME_EXTENSION_ID } from '../config/extension'

const SESSION_KEY = 'memoflip_ext_installed'
const PROBE_ID = 'toocheep-probe-element'
const MARK_ATTR = 'data-toocheep-ext'
const SETTLE_MS = 2500

function hasProbeInTree() {
    if (typeof document === 'undefined') return false
    if (document.documentElement.getAttribute(MARK_ATTR) === '1') return true
    if (document.getElementById(PROBE_ID)) return true

    const hosts = document.querySelectorAll('plasmo-csui')
    for (const host of hosts) {
        try {
            if (host.shadowRoot?.getElementById(PROBE_ID)) return true
        } catch {
            /* closed shadow root */
        }
    }
    return false
}

function pingStoreExtension() {
    return new Promise((resolve) => {
        const runtime = window.chrome?.runtime
        if (!runtime?.sendMessage || !CHROME_EXTENSION_ID) {
            resolve(false)
            return
        }
        try {
            runtime.sendMessage(CHROME_EXTENSION_ID, { type: 'toocheep-ping' }, (res) => {
                if (runtime.lastError) resolve(false)
                else resolve(Boolean(res?.ok))
            })
        } catch {
            resolve(false)
        }
    })
}

function readCached() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
        return false
    }
}

function writeCached(value) {
    try {
        if (value) sessionStorage.setItem(SESSION_KEY, '1')
        else sessionStorage.removeItem(SESSION_KEY)
    } catch {
        /* private mode */
    }
}

export function useExtensionInstalled() {
    // 快取只當樂觀初始值；進頁後一定再探測，拿掉外掛要能變回未安裝
    const [installed, setInstalled] = useState(readCached)

    useEffect(() => {
        let cancelled = false
        let confirmed = false

        const markInstalled = () => {
            if (cancelled || confirmed) return
            confirmed = true
            writeCached(true)
            setInstalled(true)
        }

        const markMissing = () => {
            if (cancelled || confirmed) return
            writeCached(false)
            setInstalled(false)
        }

        const check = () => {
            if (hasProbeInTree()) markInstalled()
        }

        const onMessage = (event) => {
            if (event.source !== window) return
            if (event.origin !== window.location.origin) return
            const data = event.data
            if (data?.source === 'toocheep-word-catcher' && data?.type === 'ready') {
                markInstalled()
            }
        }

        check()
        pingStoreExtension().then((ok) => {
            if (ok) markInstalled()
        })

        window.addEventListener('message', onMessage)
        const observer = new MutationObserver(check)
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
        const timer = window.setInterval(check, 400)
        const settle = window.setTimeout(() => {
            window.clearInterval(timer)
            observer.disconnect()
            if (!confirmed) markMissing()
        }, SETTLE_MS)

        return () => {
            cancelled = true
            window.removeEventListener('message', onMessage)
            window.clearInterval(timer)
            window.clearTimeout(settle)
            observer.disconnect()
        }
    }, [])

    return installed
}
