import { useEffect, useState } from 'react'
import { CHROME_EXTENSION_ID } from '../config/extension'

const SESSION_KEY = 'memoflip_ext_installed'
const PROBE_ID = 'toocheep-probe-element'
const MARK_ATTR = 'data-toocheep-ext'

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

export function useExtensionInstalled() {
    const [installed, setInstalled] = useState(() => {
        try {
            return sessionStorage.getItem(SESSION_KEY) === '1'
        } catch {
            return false
        }
    })

    useEffect(() => {
        let cancelled = false
        let found = false

        const markFound = () => {
            if (cancelled || found) return
            found = true
            try {
                sessionStorage.setItem(SESSION_KEY, '1')
            } catch {
                /* private mode */
            }
            setInstalled(true)
        }

        const check = () => {
            if (hasProbeInTree()) markFound()
        }

        const onMessage = (event) => {
            if (event.source !== window) return
            const data = event.data
            if (data?.source === 'toocheep-word-catcher' && data?.type === 'ready') {
                markFound()
            }
        }

        check()
        pingStoreExtension().then((ok) => {
            if (ok) markFound()
        })

        window.addEventListener('message', onMessage)
        const observer = new MutationObserver(check)
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
        const timer = window.setInterval(check, 400)
        const stop = window.setTimeout(() => {
            window.clearInterval(timer)
            observer.disconnect()
        }, 8000)

        return () => {
            cancelled = true
            window.removeEventListener('message', onMessage)
            window.clearInterval(timer)
            window.clearTimeout(stop)
            observer.disconnect()
        }
    }, [])

    return installed
}
